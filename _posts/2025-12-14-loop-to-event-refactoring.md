---
layout:     post
title:      "동기 루프를 이벤트 기반 처리로 바꿔보자(feat. 응답 시간 분리)"
description: "이벤트 기반 처리 구조로 전환해 외부 연동의 병목을 해결해보자."
date:       2025-12-14 10:30:00 +0900
author:     "김미림"
header-img: assets/img/posts/2025-12-14-loop-to-event-refactoring/sequence_diagram.png

categories:
  - Spring
  - Backend
  - Java
  - Refactoring
---

안녕하세요, 개발자 김미림입니다.

최근 외부 배송 연동 로직을 정리하면서, 한 번의 요청 안에서 모든 건을 순차 처리하던 구조를 이벤트 기반 비동기 처리로 바꾸는 작업이 있었습니다.<br>
이번 글에서는 `for` 루프 안에서 외부 API를 즉시 호출하던 구조가 왜 부담이 되었는지, 그리고 어떤 기준으로 이벤트 방식의 전환을 선택했는지 정리해 보았습니다.

이 글은 대규모 아키텍처 전환기라기보다는, 운영 중인 서비스를 덜 불안하게 만들기 위한 현실적인 리팩터링 기록에 가깝습니다.<br>
비슷하게 "지금은 동작하지만, 계속 이 구조로 가도 괜찮을까?"를 고민하고 계신 분들께 작은 참고가 되었으면 합니다.

<br>

## 읽기 가이드: 먼저 보고 가면 좋은 포인트

이번 개선에서 중심이 된 포인트는 아래 4가지였습니다.

1. 기존 구조는 요청 스레드 안에서 모든 대상 건을 순차 처리하는 동기 루프 기반이었다.
2. 외부 API 호출과 결과 저장까지 한 흐름에 묶여 있어 응답 지연과 장애 전파 범위가 컸다.
3. 개선 후에는 요청 접수와 실제 처리를 분리하고, `requestId`로 상태를 추적할 수 있게 했다.
4. 최종적으로는 `ApplicationEventPublisher` + `@TransactionalEventListener` 조합으로 "저장 후 처리" 흐름을 만들었다.

아래에서는 위 내용을 코드 변화와 함께 조금 더 자세히 정리해 보겠습니다.

<br>

# "느리다"

처음 개선을 고려했던 계기는 현업의 "느리다"는 문의 때문이었습니다.<br/>
24년도 마지막 구축 작업 후 문제 없이 사용해오던 서비스가 갑작스러운 병목을 맞았고, 일부 요청은 최대 7초 가까이 응답이 지연되고 있었습니다.<br/>
어디서 시간이 밀리는지 확인하기 위해 주요 시작점과 끝점에 수행 시간을 남기는 로그를 심고, 같은 요청 흐름을 5~8회 반복해서 확인했습니다.

```java
long startedAt = System.currentTimeMillis();
log.info("processApi start. itemId={}, startedAt={}", item.getId(), startedAt);

callExternalApi(item);

long finishedAt = System.currentTimeMillis();
log.info("processApi end. itemId={}, finishedAt={}, elapsed={}ms",
        item.getId(), finishedAt, finishedAt - startedAt);
```

이렇게 확인해 보니 외부 API 응답이 오래 걸리는 구간이 먼저 보였고, 여기에 `for` 루프 기반 순차 호출 구조가 겹치면서 지연이 요청 단위로 누적된다는 점을 확인할 수 있었습니다.<br/>
즉, 단순히 "한 번 느리다"의 문제가 아니라, 외부 API 대기 시간이 아이템 수만큼 반복되며 전체 응답 시간을 끌어올리는 구조였고, 이 지점을 줄이기 위해 리팩터링을 진행하게 되었습니다.

<br>

# 처음 눈에 들어온 불안 요소

기존 배송 처리 서비스를 보면, 요청 진입 직후 유효성 검사를 마친 뒤 곧바로 외부 API와의 통신을 처리하는 `setProcessing()`으로 진입해 전체 처리를 진행하는 구조였습니다.<br>
겉으로 보기에는 단순하고 이해하기 쉬웠지만, 운영 관점에서는 몇 가지 불안 요소가 함께 보였습니다.

```java
var summery = setProcessing(items, requestType, serviceType);
return buildResponse(summery, requestType, serviceType);
```

`setProcessing()` 내부에서는 각 요소를 순회하며 외부 API를 즉시 호출하고, 성공/실패 결과를 그 자리에서 누적했습니다.

```java
for (DeliveryRequest item : items) {
    ItemProcessResult result = processApi(item, requestType, serviceType);
    summary.addResult(result);
}
```

처음에는 "어차피 요청이 들어왔으니 여기서 끝까지 처리하면 되는 것 아닌가?" 싶었습니다.<br>
그런데 구조를 조금만 더 들여다보니, 이 방식은 요청 하나의 생명주기에 너무 많은 책임을 몰아넣고 있었습니다.

특히 아래와 같은 점이 계속 신경 쓰였습니다.

1. 요청 건수가 많아질수록 사용자 응답 시간이 외부 API 처리 시간에 그대로 끌려간다.
2. 중간에 일부 건만 실패해도 전체 응답 정책이 복잡해지고, 실패 메시지 조합도 점점 지저분해진다.
3. DB 저장, 외부 API 호출, 결과 집계가 한 메소드 흐름에 섞여 있어 장애 지점을 분리해 보기 어렵다.

단순하게 생각했던 구조가, 운영 부담을 누적시키고 있었습니다.

<br>

# 기존 구조를 조금 더 뜯어보자

문제를 더 명확히 보기 위해, 당시 트랜잭션 처리 서비스가 어떤 위치에서 쓰이고 있었는지도 함께 봤습니다.<br>
이 서비스는 `saveBookingData()`처럼 요청 데이터를 저장하거나, 처리 결과를 문자열 형태로 갱신하는 보조 역할에 가까웠습니다.

```java
@Transactional(propagation = Propagation.REQUIRES_NEW, timeout = TIME_OUT)
public ProcessingState saveBookingData(RequestPayload param) {
    try {
        query.savePayload(param);
    } catch (Exception e) {
        log.error("요청 정보 저장 중 오류 발생 : {}", e.getMessage());
        return ProcessingState.builder().stateCode(500).stateMsg("요청 정보 저장 중 오류가 발생했습니다.").build();
    }

    return null;
}
```

하지만 중요한 점은, 이 트랜잭션 서비스가 처리 흐름의 경계를 나누는 역할까지 하지는 못했다는 점입니다.<br>
실제 요청 흐름은 `processRequest()`에서 유효성 검증을 마치면 곧바로 `setProcessing()`으로 이어졌고, 그 안에서 각 아이템을 순차 처리하면서 `processApi()`가 외부 배송 API를 직접 호출했습니다.

결국 DB 저장이나 상태 갱신은 중간중간 수행됐지만, 전체 요청은 여전히 하나의 동기 흐름 안에 묶여 있었습니다.<br>
그래서 `resultMsgUpdate()`까지 모두 끝나야만 응답을 돌려줄 수 있었고, 외부 API 호출이 길어질수록 사용자 요청도 같은 시간만큼 함께 블로킹됐습니다.

<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2025-12-14-loop-to-event-refactoring/as-is.png" alt="AS-IS 구조" class="img-20">
  <br>
  <em>요청부터 외부 API 호출, 응답 반환까지 하나의 흐름으로 묶여 있던 as-is 구조</em>
</p>

이 흐름을 보면서 다음과 같은 질문이 생겼습니다.

1. 요청은 이미 받았는데, 왜 사용자는 외부 API 호출이 모두 끝날 때까지 기다려야 할까?
2. 저장은 됐지만 처리는 아직 안 된 상태를 표현할 방법이 왜 없을까?
3. 처리 완료 여부를 나중에 다시 조회할 수 있다면 응답 정책이 더 단순해지지 않을까?

이 질문들에 대한 답이 결국 이번 리팩터링의 방향이 되었습니다.

<br>

# 1번째 개선, 요청 접수와 실제 처리를 분리하기

가장 먼저 바꾼 부분은 `processRequest()`의 책임이었습니다.<br>
이제 이 메소드는 "모든 것을 즉시 처리"하는 대신, "요청을 접수하고 처리용 이벤트를 발행"하는 역할만 담당합니다.

```java
String requestId = processAndPublishEvent(items, requestType, serviceType);

return ProcessingState.builder()
        .stateCode(202)
        .requestId(requestId)
        .stateMsg("요청이 접수되었습니다. 처리가 완료되면 알림이 표시됩니다.")
        .build();
```

이 변화가 의미하는 바는 꽤 분명했습니다.

1. 사용자 응답은 더 이상 외부 API 전체 처리 시간에 종속되지 않는다.
2. 서버는 "접수 완료"와 "처리 완료"를 별도 상태로 다룰 수 있다.
3. 이후 상태 조회 API를 붙이거나, 화면에서 폴링하는 구조로 확장하기 쉬워진다.

특히 `202 Accepted` 성격의 응답과 `requestId`를 함께 내려주는 방식은, 요청 단위 추적을 가능하게 만든다는 점에서 가장 실용적이었습니다.<br>
이전에는 "성공/실패"만 즉시 결정하려 했지만, 이제는 "일단 접수됨"이라는 상태를 명시적으로 다룰 수 있게 된 것이죠.


여기서 한 번 더 고민했던 부분은 "이벤트를 발행한다" 자체보다, **어떤 방식으로 커밋 이후 실행을 보장할 것인가**였습니다.<br>
실행 순서를 보장하면서도 현재 의도한 바를 문제 없이 처리할 수 있는 방법으로 서비스 내에서 직접 호출하거나, 스케줄링, 메시지 큐와 같은 기술들을 고려했습니다.<br>
하지만, 이번 작업에서는 외부 API 호출 기능을 실제로 사용하는 인원이 1명 수준이었고 동시성 제어를 아주 깊게 가져가야 하는 상황도 아니어서, 처음부터 큰 인프라를 얹는 것은 오버 엔지니어링에 가깝다고 판단했습니다.<br>
직접 호출도 가능한 방법이었지만, 저장 이후 처리라는 경계를 코드상으로도 분명히 나누고 싶었기 때문에, 현재 규모에서 가장 단순하면서도 의도가 잘 드러나는 `ApplicationEventPublisher`와 `@TransactionalEventListener` 조합을 선택했습니다.

| 대안 | 장점 | 이번 상황에서 아쉬웠던 점 |
| --- | --- | --- |
| 서비스 메소드에서 직접 호출 | 구현이 가장 단순하고 추가 기술이 거의 필요 없다 | 저장 이후 처리라는 경계가 메소드 안에 섞여 보여 책임 분리가 약해진다 |
| 스케줄링 기반 처리 | 일정 주기로 재시도하거나 배치 처리 흐름을 만들기 쉽다 | 즉시성 있는 후속 처리에는 다소 무겁고, 현재 요구사항에 비해 운영 포인트가 늘어난다 |
| 메시지 큐 도입 | 확장성, 버퍼링, 소비자 분리에 유리하다 | 실제 사용 규모와 동시성 수준을 고려하면 초기 복잡도가 너무 커진다 |
| `@TransactionalEventListener` | 커밋 이후 실행 시점을 애플리케이션 코드 안에서 비교적 간단히 표현할 수 있다 | 대규모 분산 처리까지 커버하는 해법은 아니지만, 현재 요구에는 충분했다 |

<br>

# 2번째 개선, 저장 후 처리 흐름 보장하기

이벤트는 결국 "처리를 나중에 이어서 하라"는 신호를 발행하는 동작일 뿐이라, 안전하게 쓰려면 **이 이벤트가 수행되어야 하는 시점**을 먼저 명확히 정해야 했습니다.<br>
이번 케이스에서는 외부 API 처리가 요청 객체를 기준으로 이어지므로, 관련 데이터가 DB에 온전히 저장된 뒤에만 다음 단계가 시작되어야 했습니다.<br>
그래서 트랜잭션 서비스의 흐름을 아래처럼 정리했습니다.

```java
@Transactional
public String publishEvent(..., String requestId, ApplicationEventPublisher eventPublisher) {
    saveProcessingRequest(..., requestId); // db저장

    ProcessingEvent event = new ProcessingEvent(...);
    eventPublisher.publishEvent(event); // 이벤트 발행

    return requestId;
}
```

이렇게 흐름을 바꾸면 기대효과도 분명했습니다.<br>
먼저 이벤트 소비 측은 `requestId`로 대기 데이터를 조회할 때, "아직 저장이 안 되어 빈 결과가 나오는" 상황을 피할 수 있습니다.<br>
여기서 한 가지 분리해서 봐야 할 점은, **이벤트를 발행하는 시점**과 **이벤트 핸들러가 실제로 실행되는 시점**은 다를 수 있다는 점입니다.<br>
이번 구현에서 사용한 `@TransactionalEventListener`는 리스너 실행 시점을 <u>트랜잭션 생명주기</u>에 맞춰 묶어 줍니다.<br>
즉, `publishEvent()`를 호출했다고 해서 이벤트가 즉시 처리되는 것이 아니라, Spring이 현재 트랜잭션과 연결된 후속 실행 대상으로 등록해 두었다가 정해진 시점에 실행합니다.<br>
그래서 쿼리 실행 전이든 후든 `publishEvent()` 호출 위치 자체보다, 최종적으로 트랜잭션이 커밋되었는지 롤백되었는지가 더 중요한 기준이 됩니다.<br>
저장 단계에서 문제가 생겨 트랜잭션이 롤백되면 후속 이벤트 처리도 이어지지 않으므로, "저장은 실패했는데 외부 API만 호출되는" 식의 불일치를 막을 수 있습니다.<br>
결국 저장이 완료된 요청만 다음 단계로 넘긴다는 기준이 생기면서, 처리 흐름의 일관성과 안전성을 함께 확보할 수 있었습니다.

<br>

# 3번째 개선, 백그라운드에서 이벤트 처리하기

이제 이벤트 핸들러에서 실제 외부 API 호출을 수행합니다.<br>
앞 단계에서 이벤트를 발행했다면, 이 단계는 그 이벤트가 `AFTER_COMMIT` 조건을 만족한 뒤에야 실행되는 지점이라고 보면 됩니다.

```java
@Async("deliveryTaskExecutor")
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handleProcessingEvent(ProcessingEvent event) {
    deliveryProcessingService.processInBackground(...);
}
```

여기서 중요한 포인트는 2가지입니다.

1. `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`으로 커밋 후에만 처리되게 한다.
2. `@Async`로 요청 스레드와 실제 처리 스레드를 분리한다.

이 조합 덕분에 요청 처리부는 "접수"에 집중하고, 실제 외부 API 호출 루프는 백그라운드 작업으로 밀어낼 수 있었습니다.<br>

기존에는 사용자가 기다리는 동안 서버가 API를 끝까지 다 호출해야 했으나,<br>
이제 서버가 "받았다, 저장했다, 이제 백그라운드에서 처리하겠다"는 식으로 동작 흐름을 분리할 수 있게 되었습니다.  
<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2025-12-14-loop-to-event-refactoring/to-be.png" alt="TO-BE 구조" class="img-10">
  <br>
  <em>이벤트 구조로 전환한 후 to-be 구조</em>
</p>

<br>

# 4번째 개선, 요청 상태 발자국 남기기

이벤트 처리로 바꾸면 자연스럽게 따라오는 요구사항이 하나 있습니다.<br>
**"그래서 지금 이 요청은 어디까지 갔는가?"**를 알 수 있어야 한다는 점입니다.

이를 위해 후속 코드에는 요청 상태 조회와 상태값 갱신 로직이 추가되었습니다.

```java
public RequestState getRequestState(String requestId) {
    return query.getRequestState(requestId);
}
```

```java
public void updateDataStatusBeforeProcessing(String requestId) {
    UpdateStatus param = new UpdateStatus(RequestStatus.ING.getType(), requestId);
    query.updateBeforeProcessing(param);
}
```

즉, 이번 리팩터링은 단순히 실행 위치만 옮긴 것이 아니라 아래와 같이 상태 모델도 함께 만든 작업이었습니다.

1. 요청 접수: `requestId` 발급
2. 처리 대기: 저장 완료 후 `WAITING`
3. 처리 시작: 이벤트 소비 시 `ING`
4. 처리 완료: 외부 API 결과 코드 저장

외부 API는 요청 결과를 `S`(성공) 또는 `E`(실패) 코드로 내려주도록 되어 있었습니다.<br>
그래서 처리 완료 시점에는 이 결과 코드를 기본 상태로 저장하고, 실패 응답인 경우에는 원인 메시지를 별도 컬럼으로 함께 남기는 방식으로 정리했습니다.<br>
덕분에 운영에서는 "일단 실패했다"는 사실을 코드로 빠르게 구분할 수 있었고, 상세 원인은 실패 메시지로 따로 확인할 수 있었습니다.

이렇게 상태를 나눠두니 운영 중에도 훨씬 덜 답답했습니다.<br>
예전에는 "왜 아직 결과가 안 나오지?"가 로그를 뒤져야 답이 나오는 질문이었다면, 이제는 최소한 "대기 중인지, 처리 중인지"를 데이터로 볼 수 있게 되었기 때문입니다.

<br>

# 바꾸고 보니 무엇이 좋아졌나

정리하면 이번 변경으로 얻은 이점은 아래와 같았습니다.

1. 사용자 응답 시간과 외부 API 처리 시간을 분리할 수 있게 되었습니다.
2. 요청 단위 추적 식별자인 `requestId`가 생겨 장애 분석 포인트가 명확해졌습니다.
3. 저장 후 처리, 처리 중, 처리 완료를 나눌 수 있어 운영 가시성이 좋아졌습니다.
4. 서비스 메소드가 "즉시 실행 오케스트레이션"에서 "접수 + 이벤트 발행" 중심으로 단순화되었습니다.
5. 3개월 프로덕션 운영 중 처리 실패 0건을 유지했고, 사용자가 접수 요청을 보낸 뒤 서버로부터 접수 응답을 받기까지의 평균 latency도 1ms 미만으로 유지할 수 있었습니다.

물론 이 방식이 만능은 아닙니다.<br>
이벤트 기반 처리로 바꾸면 상태 관리, 재처리 정책, 중복 실행 방지 같은 주제를 함께 고려해야 합니다.<br>
다만 기존처럼 요청 한 번에 모든 걸 동기적으로 밀어 넣는 구조보다는, 적어도 어디서 병목이 생기고 무엇을 추적해야 하는지는 훨씬 선명해졌습니다.

<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2025-12-14-loop-to-event-refactoring/sequence_diagram.png" alt="TO-BE 구조" class="img-70">
</p>

<br>

# 개선 작업을 마치며

이번 작업은 "엄청난 기술 도입"보다는, 운영 흐름을 조금 더 현실적으로 정리한 리팩터링에 가까웠습니다.<br>
특히 외부 API 연동처럼 상대 시스템 응답 속도와 장애 가능성을 완전히 통제할 수 없는 영역에서는, 요청 접수와 실제 처리를 분리하는 것만으로도 체감 차이가 꽤 크다는 점을 다시 느꼈습니다.

개인적으로는 이번 리팩터링을 통해, 단순히 메소드 길이를 줄이는 것보다 **어떤 책임을 요청 생명주기 안에 둘 것인가**를 결정하는 일이 더 중요하다는 점을 많이 배웠습니다.<br>
다음 포스팅은 한참 작업 진행 중에 있는 Netty 서버 개선기가 될 것 같습니다.

<br><br>

긴 글 읽어주셔서 감사합니다!
