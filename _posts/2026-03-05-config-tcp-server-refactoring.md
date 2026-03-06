---
layout:     post
title:      "동기화 서버를 정신 차리게 해보자(feat. 리팩터링)"
description: "WebFlux + Netty로 작성되어 있는 매출 동기화 서버의 데이터베이스 커넥션 고갈 문제를 해결해보자."
date:       2026-03-05 10:30:00 +0900
author:     "김미림"
header-img: assets/img/posts/2026-03-05-config-tcp-server-refactoring/to-be.png

categories:
  - Backend
  - Java
---

안녕하세요, 비IT 기업에서 개발자로 재직 중인 김미림입니다.

코로나 팬데믹 이후로 키오스크의 도입 비율은 점점 증가해왔습니다. 자사 또한, 무인 판매점의 운영을 지원하고 있고 자체적으로 동기화 서버를 구축해 관리 중에 있습니다.<br>
Spring Boot/Java 기반의 웹 개발이 주력이었던 저로써는 WebFlux + Netty로 작성되어 있는 이벤트 기반의 비동기 서버를 개선해야 하는 과제는 쉽게 도전하기 힘들었습니다.

그럼에도 불구하고 개선을 해야만 했던 배경과, 어떤 기준을 기반으로 해결하고자 했는지에 대한 글을 시작해보려 합니다.

<br><br>

# 갑자기 닥친 장애?

2025년 8월의 어느날, 약 오후 1시 이후부터 점주 고객들로부터 매출ASP 사이트 *(자사에서 제공하는 매출 레포트 시스템입니다.)* 에 접속이 되지 않는다는 CS 문의가 쏟아졌습니다.<br>
동기화 서버의 존재는 알고 있었지만 다른 업무에 더 비중을 쏟느라 그동안 신경쓰지 못하고 있었는데요.<br>
서버를 구축하신 전 담당자분이 문서를 남기지 않고 퇴사하신 관계로, 프로젝트의 전반적인 흐름을 파악하는 것을 우선하게 되었습니다.<br>
개인적으로 정보가 1개도 없는 프로젝트에 대해 분석할 때는 환경을 파악하는 일을 가장 먼저 진행하기 때문에, 
이번에도 역시 환경을 확인하는 게 우선이다 싶어서 어느 서버 위에 동작 중인지 점검해보는 시간을 가졌습니다.<br>
kt cloud의 2코어2메모리 *(...)* 의 아주 작고 소중한 서버를 이용하고 있었고, 데이터베이스는 DBaaS(MariaDB)를 사용 중인 것으로 확인했습니다.<br>
키오스크 뿐 아니라 POS의 매출까지 모두 관리하는 서버고, 해당 서버의 동기화 결과를 기반으로 매출 레포트를 제공해주고 있었기 때문에 매우 중요한 역할을 수행하는 서버입니다.<br>

**동기화 서버에서 발생한 문제인데 왜 매출 ASP 사이트가 영향을 받느냐..?**<br>
정답은 어떻게 보면 당연하게도 <u>동기화 서버와 매출ASP 서버가 동일한 데이터베이스를 바라보고 있었기</u> 때문이었습니다.<br>

<br>

# 원인을 찾아보자

코드를 분석해 보니 수신, 검증, 데이터 동기화, DB 설정까지 모두 하나로 연결되어 있어 작은 변경이 전체 동작에 영향을 주기 쉬운 구조였습니다.<br>

### **1. 로그를 까보자**

동기화 서버의 오류 로그를 확인해보니 지속적으로 다음과 같은 기록이 반복되고 있었습니다.
> io.netty.handler.codec.TooLongFrameException ...
> #### [TooLongFrameException](https://netty.io/3.8/api/org/jboss/netty/handler/codec/frame/TooLongFrameException.html) 이란?
> - `DecoderException` 을 상속한 예외 클래스입니다.
> - Netty 프레임워크에서 발생하는 예외로, 디코더가 처리하려는 데이터 프레임(frame)의 길이가 설정된 최대 허용치를 초과했을 때 발생합니다.<br>
> *(즉, 네트워크로 들어온 메시지가 너무 크다...!)*

이 문제는 디코더에 설정된 최대 길이 파라미터를 수정하는 것으로 간단히 해결할 수 있는 문제로 보여졌습니다.<br>
네트워크로 인입되는 데이터를 3일 간 모니터링하고, 모든 데이터 크기를 수용할 수 있는 최대치를 파악해 적용했습니다.<br>

```java
// before: 최대 1MB 라인 프레임 허용
channel.pipeline().addFirst(new LineBasedFrameDecoder(1024 * 1024));
```

```java
// after: 최대 3MB 라인 프레임 허용
channel.pipeline().addFirst(new LineBasedFrameDecoder(3 * 1024 * 1024));
```

<br>

### **2. 해치웠나?**

서버에 수정된 내용을 반영하고, 한달 간 모니터링을 진행했습니다.<br>
모니터링 기간 동안 별도의 오류 없이 정상 동작하는 모습을 보여주어, 이것으로 문제가 해결되었다는 천진난만한 생각을 하게 되었습니다...*(너무 이른 착각이었다...)*


<br>

## 빙산의 일각이었던 건에 대하여

모든 사건의 발단은 수정 후 2달 뒤 발생한 데이터베이스 커넥션 고갈 문제였습니다..<br>
**왜???** 이런 문제가 발생했는가? 기존 시스템의 처리 구조를 확인하지 아니하지 아니하지 아니....(중략)<br>
추석 연휴를 반납하고 원인을 파악하기 위한 작업에 돌입했습니다.

기존 서버의 진입로에서는 메시지 파싱, 클라이언트 검증, 데이터 동기화 호출, 응답 전송을 한 곳에서 처리함을 확인할 수 있었습니다.<br>
또한 subscribe가 중첩으로 연결되는 패턴도 확인할 수 있었습니다.<br>
```java
// Before sample
// validateAsp -> validateClient -> syncPayload 가 subscribe 중첩으로 연결됨
syncService.validateAsp(aspId)
    .subscribe(aspEnabled -> {
        if (!aspEnabled) {
            out.sendString(Mono.just("FEATURE_DISABLED")).then().subscribe();
        } else {
            syncService.validateClient(clientKey)
                .subscribe(clientValid -> {
                    if (!clientValid) {
                        out.sendString(Mono.just("INVALID_CLIENT")).then().subscribe();
                    } else {
                        syncService.syncPayload(entityAList, entityBList, entityCList, entityDList, entityEList)
                            .subscribe(null, err -> {
                                out.sendString(Mono.just("SYNC_ERROR")).then().subscribe();
                            }, () -> out.sendString(Mono.just("OK")).then().subscribe());
                    }
                });
        }
    });
```

또한 서비스 레이어를 확인하니, 하나의 서비스가 여러 Repository를 직접 들고 각 도메인 저장 로직을 한 메소드 내에서 모두 처리하는, 결합도 높은 구조를 확인할 수 있었습니다.

```java
// Before sample
@Autowired EntityARepository entityARepository;
@Autowired EntityBRepository entityBRepository;
@Autowired EntityCRepository entityCRepository;
@Autowired EntityDRepository entityDRepository;
@Autowired EntityERepository entityERepository;

public Flux<EntityE> syncPayload(...) {
    // entityA -> entityB -> entityC -> entityD -> entityE 순으로 연결
    return fluxA.thenMany(fluxB).thenMany(fluxC).thenMany(fluxD).thenMany(fluxE);
}
```

<br>

지금까지 확인된 정보를 가시화하면 아래의 다이어그램과 같을 것입니다. 
앞에서 데이터 수신 버퍼가 연쇄적으로 폭발할 장애를 열심히 막아주고 있었는데, 제가 촉발시킨 셈이네요...<br>
운영 안정성을 저하시키는 다양한 문제들이 확인되었고, 가장 급한 문제부터 순차적으로 해결해 나가는 계획을 세웠습니다.<br>
<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2026-03-05-config-tcp-server-refactoring/as-is.png" alt="AS-IS 구조" class="img-70">
  <br>
  <em>기존 구조의 시퀀스 다이어그램</em>
</p>

<br>

## 1번째 개선, 데이터 수신 디코더 전환

먼저 수신 로그를 보면, 데이터가 아래 특징을 갖고 있었습니다.

1. 한 건이 **거대한 단일 JSON 객체**로 들어옴
2. `당일 매출합계`, `주문`, `주문상세`, `영수증정보`, `승인정보` 배열이 포함되어 payload 크기가 큼
3. 줄바꿈(`\n`) 기반으로 메시지가 끊기지 않음

기존 코드에서는 아래처럼 라인 구분 디코더를 사용하고 있었습니다.

```java
// before
.doOnChannelInit((observer, channel, socketAddrh) ->
    channel.pipeline().addFirst(new LineBasedFrameDecoder(1024 * 1024)))
```

[LineBasedFrameDecoder](https://netty.io/3.8/api/org/jboss/netty/handler/codec/frame/LineBasedFrameDecoder.html)는 이름 그대로 개행 문자를 기준으로 프레임을 분리합니다.  
그런데 실제 입력은 “한 줄 JSON”이고 크기가 큰 편이라, 개행 기준 분리가 되지 않은 상태에서 수신 데이터 길이 제한에 걸려 `TooLongFrameException`이 반복될 수밖에 없었습니다.

해당 문제는 디코더의 종류를 전환하는 것으로 해결해보고자 했습니다.

가장 먼저 고려했던 대안은 보편적으로 안정적이라 평가되는 `LengthFieldBasedFrameDecoder`였습니다.<br>
다만 해당 디코더를 사용하기 위해서는 클라이언트가 길이 헤더를 붙여 데이터를 전송해야 하는데, 
기존 클라이언트(키오스크)의 프로토콜을 즉시 변경하기 어렵다는 문제가 있었고, 결국 고려 대상에서 제외할 수밖에 없었습니다.


다음과 같은 두 가지 상황에 대해 어떤 디코더가 가장 현실적인 선택일 것인지 고려했습니다.

1. 클라이언트 프로토콜을 바꾸지 않고도 서버에서 수신 안정성을 올려야만 한다.
2. JSON 객체의 구조를 가장 효율적으로 활용할 수 있어야 한다.

결론적으로, `{ ... }` 구조의 객체 경계를 기준으로 완성된 JSON 한 건을 프레임으로 전달하는 [JsonObjectDecoder](https://netty.io/4.1/api/io/netty/handler/codec/json/JsonObjectDecoder.html)가 가장 현실적인 선택이라고 판단했습니다.<br>
`JsonObjectDecoder`를 적용하며, 네트워크 레벨의 효율성을 관리할 수 있도록 하는 설정까지 추가했습니다.

```java
// after: 최대 3MB JSON 프레임 허용 + 수신/쓰기 버퍼 상한 3MB
.childOption(ChannelOption.RCVBUF_ALLOCATOR,
        new AdaptiveRecvByteBufAllocator(32 * 1024, 256 * 1024, 3 * 1024 * 1024))
.childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,
        new WriteBufferWaterMark(256 * 1024, 3 * 1024 * 1024))
.addFirst(new JsonObjectDecoder(3 * 1024 * 1024))
```
> - `AdaptiveRecvByteBufAllocator` : 데이터가 들어오는 양을 모니터링하여 버퍼 크기를 스스로 결정할 수 있도록 합니다. 
> 메모리 단편화를 줄이고, 대용량 요청 시 GC 부담을 낮춰 시스템 전체의 처리량을 높일 수 있습니다. (샘플 코드 기준 최소 32KB - 초기 256KB - 최대 3MB 로 설정)
> - `WriteBufferWaterMark` : 버퍼가 설정된 최대치에 도달하면 `channel.isWritable()`이 `false`가 되어 서버가 잠시 쓰기를 멈추도록 유도합니다. 
> 쌓인 데이터가 빠져나가 허용치에 도달하면 다시 쓰기 가능 상태로 전환됩니다.(샘플 코드 기준 허용치 256KB - 최대 3MB 로 설정)

기존에는 개행(\n) 없는 대용량 단일 JSON이 유입되면서 `LineBasedFrameDecoder`가 프레임 경계를 찾지 못해 `TooLongFrameException`을 반복적으로 유발했습니다.<br>
그 영향으로 메시지 누락 및 재처리와 동기화 지연이 발생하며 피크 시간대 처리 안정성이 크게 흔들리는 양상이 나타났습니다.<br>
`JsonObjectDecoder`로 전환한 후 객체 경계 단위로 안정적으로 프레이밍되어 예외 발생이 눈에 띄게 줄었고, 수신 성공률과 동기화 처리 일관성이 개선됨을 확인할 수 있었습니다.

<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2026-03-05-config-tcp-server-refactoring/decoder.png" alt="메시지 디코더/파이프라인 설정" class="img-80">
  <br>
  <em>메시지 디코더/파이프라인 설정</em>
</p>

<br>

## 2번째 개선, 운영 안정성 강화하기

### 1) 단계 분리
두 번째 대응으로 고려한 내용은 단계를 분리하는 것이었습니다.<br>
위에서 메시지 파싱, 클라이언트 검증, 데이터 동기화 호출, 응답 전송을 한 곳에서 처리함을 확인했던 바 있었습니다.<br>
해당 과정들이 한 곳에 몰려 있어 장애 발생 시 각 단계별 실패 로그 포인트가 겹치는 상황이 발생했고, 원인 구간을 빠르게 특정하기 어렵게 하는 문제를 유발했습니다.<br>
특히 중첩된 비동기 흐름에서는 앞 단계의 지연/예외가 뒷 단계 타임아웃과 섞여 보여 운영 중에 실제 병목과 오류 전파 경로를 추적하기가 더 어려웠습니다.<br>

TCP 처리, 동기화 오케스트레이션, 인프라 설정의 3 단계로 구분할 수 있도록 하고, 각 단계별 성공/실패 로그와 타임아웃을 독립적으로 관리할 수 있도록 했습니다.<br>
장애 분석 속도가 빨라졌고, 재처리 시 확인해야 할 범위가 축소되었고 운영 대응 시간도 단축할 수 있었습니다.

### 2) flatMap 기반 처리 파이프라인 구축

다시 한번 해당 샘플 코드를 보겠습니다.<br>
```java
syncService.validateAsp(aspId)
    .subscribe(aspEnabled -> {
        if (!aspEnabled) {
            out.sendString(Mono.just("FEATURE_DISABLED")).then().subscribe();
        } else {
            syncService.validateClient(clientKey)
                .subscribe(clientValid -> {
                    if (!clientValid) {
                        out.sendString(Mono.just("INVALID_CLIENT")).then().subscribe();
                    } else {
                        syncService.syncPayload(entityAList, entityBList, entityCList, entityDList, entityEList)
                            .subscribe(null, err -> {
                                out.sendString(Mono.just("SYNC_ERROR")).then().subscribe();
                            }, () -> out.sendString(Mono.just("OK")).then().subscribe());
                    }
                });
        }
    });
```

해당 코드에서 가장 먼저 보이는 것이 무엇인가요? 저 같은 경우는 **subscribe()** 라는 메소드의 사용 빈도가 가장 먼저 눈에 띄었습니다. 
여기서 subscribe()는 무엇이고, 어떤 역할을 하는지 점검하고 넘어가는 게 좋아보입니다.<br>
> `subscribe` : "[Nothing Happens Until You Subscribe.](https://projectreactor.io/docs/core/release/reference/reactiveProgramming.html#reactive.subscribe)"

ProjectReactor 공식 문서에서 설명하는 `subscribe`의 설명 중 발췌했습니다. 무엇을 뜻하는 문장일까요?<br>

스프링 리액터는 **Publisher(발행자)**의 역할을 하는 2개의 객체를 제공하는데, 바로 `Flux`와 `Mono`입니다.<br>
해당 개념의 입문자인 제 기준에서 두 발행자는 다음과 같이 다가왔습니다.
1. `Flux` : Java의 List와 유사하며 N개의 요소를 방출할 수 있다.
2. `Mono` : Java의 Optional과 유사하며, 0개 또는 1개의 요소만 방출할 수 있다.

리액터 체인의 발행자는 "데이터를 어떻게 가공하고 흐르게 할지 정의한 `명세`일 뿐, 그 자체로는 실행되지 않는다" 라는 설명이 있었습니다.<br>
이 명세가 <u>실제 동작</u>으로 변하여 데이터가 흐를 수 있도록 **'촉발'**하는 것이 바로 `subscribe`의 호출이라는 것입니다.<br>
마치 유튜브 채널에 영상이 올라와도 내가 **'구독'** 버튼을 누르고 알림을 받기 전에는 아무런 일도 일어나지 않는 것과 같은 흐름입니다.

잠깐 시간을 내어 해당 흐름의 동작 과정을 살펴보면 어떨까요?

```java
Flux<Integer> flux = Flux.just(1, 2, 3, 4, 5);
flux.subscribe(System.out::println);
```

위 코드는 어떻게 동작할까요?
1. `Flux.just(1, 2, 3, 4, 5)`는 수도관을 조립하는 과정이라고 할 수 있습니다. 1번부터 5번까지의 관을 모두 연결해둔 상태죠.<br>
하지만 수도꼭지를 돌리지 않았기 때문에, 관 안에는 물이 한 방울도 흐르지 않습니다. 그저 <u>"물이 이렇게 흐를 것이다"</u>라는 명세일 뿐입니다.
2. `subscribe()`를 통해 수도꼭지를 돌리는 행위를 수행합니다. 이 버튼을 누르는 순간, 비로소 조립된 관을 타고 물(데이터)이 흐르게 됩니다.<br>
그리고 `System.out::println`이라는 **Subscriber(소비자)**가 그 물을 받기 시작하는거죠.

##### 왜 즉시 실행하지 않고 '구독'을 거칠까요?

Java의 `List`나 `Stream`에 익숙하다면, 구독을 거치는 과정에 대해 의문이 들 수 있을 것이라 생각합니다.*(저만 그랬나요...?)*<br>
위에서 설명한 것과 같은 동작의 핵심 원리는 **Lazy Evaluation(지연 평가)**라는 것으로, "필요할 때만 실행"되도록 하여 구독 전에는 파이프라인 정의만 유지하고 실제 I/O·연산을 지연시키는 것을 의미합니다.<br>
이 특성은 다음과 같은 환경에서 특별히 효과를 발휘합니다.
1. Netty 환경 : 이벤트 루프를 불필요한 작업으로 점유하지 않게 한다.
2. R2DBC 환경 : 실제 요청이 들어온 시점에만 커넥션 획득 및 쿼리 실행이 일어나도록 해 피크 구간의 리소스 낭비를 줄인다.

결국 고성능 환경에서 Lazy Evaluation은 처리량을 유지하면서도 지연 시간 급증과 커넥션 풀 압박을 완화하는 방향으로 동작하기 때문에, 구독 시점을 의도적으로 통제하는 설계가 중요해지는 원리이죠.

##### 중첩 subscribe 구조는 왜 안 좋은가요?

입문자 관점에서 가장 크게 혼란했던 지점은 **"정상적으로 동작하는 것으로 보여진다"**는 점이었습니다.<br>
그러나 Reddit이나 StackOverflow 와 같은 질문 플랫폼을 좀 더 찾아보니 다음과 같은 문제들을 확인할 수 있었습니다.
1. `subscribe` 안에서 또 `subscribe`를 호출하면, 바깥 구독을 끊어도 안쪽 구독이 남을 수 있다.(해지 누락)
2. 안쪽에서 발생한 에러가 바깥 흐름으로 깔끔하게 전달되지 않으며, 응답 순서가 꼬여 레이스 컨디션이 생기기 쉽다.

예를 들어 검증 A 성공 후 검증 B를 호출하고 그 안에서 동기화를 또 구독하면, 중간에 요청 취소가 발생해도 이미 시작된 내부 구독이 계속 돌아 DB 작업이나 응답 전송이 뒤늦게 실행될 수 있습니다.<br>
그래서 실무에서는 `flatMap`/`switchMap`/`concatMap` 같은 연산자로 "하나의 체인"으로 연결해, 취소·에러·완료 신호를 한 경로로 관리하는 방식을 권장합니다.<br>
이렇게 바꾸면 코드 가독성뿐 아니라 장애 추적성과 운영 안정성까지 함께 좋아집니다.

현재 기존 코드는 `validateAsp -> validateClient -> syncPayload`의 순서로 `subscribe`가 중첩된 기존 구조를 가지고 있습니다. 
`syncPayload`에서 예외가 나도 어떤 구독 체인에서 끊겼는지 로그만으로 추적이 어렵고, 불필요한 자원 낭비가 발생할 수 있죠. <br>
이를 `flatMap` 기반의 단일 체인으로 바꿔 검증과 동기화, 응답 전송을 한 흐름에서 처리하고, `timeout`/`onErrorResume`을 체인 끝에서 일괄 적용하도록 수정했습니다. <br>
수정 후에는 에러 전파 경로가 일관되게 정리되어 장애 원인을 파악하기 쉬워졌고, 실패 응답 누락이 줄었으며 운영 중 타임아웃·예외 대응의 예측 가능성이 크게 높아졌습니다.

여기서 `flatMap`을 선택한 이유는 각 단계가 `Mono`를 반환하는 비동기 작업이기 때문입니다. 
1. `map`은 `Mono<Mono<T>>`처럼 중첩 타입을 만들기 쉬워 후속 처리와 에러 전파가 복잡해질 수 있다.
2. `switchMap`은 새 신호가 오면 이전 작업을 취소하므로 요청 단위 검증/동기화 흐름에는 부적합하다.
3. `concatMap`은 순차 보장이 강점이지만 현재 케이스처럼 단일 요청 체인에서는 이점이 크지 않다.

결과적으로 비동기 단계를 자연스럽게 평탄화하고 단일 실패 경로를 유지할 수 있는 `flatMap`이 가장 실용적이었습니다.

아래는 수정이 완료된 코드의 샘플입니다.

```java
return domainSyncService.validateAsp(aspId)
    .flatMap(aspEnabled -> {
        if (!aspEnabled) {
            return outbound.sendString(Mono.just("FEATURE_DISABLED")).then();
        }
        return domainSyncService.validateClient(clientKey)
            .flatMap(clientValid -> {
                if (!clientValid) {
                    return outbound.sendString(Mono.just("INVALID_CLIENT")).then();
                }
                return domainSyncService.syncPayload(entityAList, entityBList, entityCList, entityDList, entityEList)
                    .then(outbound.sendString(Mono.just("OK")).then());
            });
    })
    .timeout(Duration.ofMinutes(10))
    .onErrorResume(e -> outbound.sendString(Mono.just("SYNC_ERROR")).then());
```

<br>

## 3번째 개선, 처리 플로우 정리

마지막으로 시도한 작업은, 사실 거창한 성능 개선을 목표로 했다기 보단 부록의 느낌으로 진행했습니다. 
이왕 개선하는 김에 처리 흐름을 보다 구조적으로 정리해보자는 의도가 가장 컸습니다.<br>
매출 정보와 주문 정보를 하나로 묶어 처리하고, 그 외 정보(매출 상세, 영수증, 승인내역)를 묶어 처리하는 방식을 도입했습니다.<br>

```java
return processPhase1(entityAList, entityBList)
    .then(processPhase2(entityCList, entityDList, entityEList))
    .timeout(Duration.ofMinutes(5));

private Mono<Void> processPhase1(List<EntityA> entityAList, List<EntityB> entityBList) {
    return processEntityAWithTimeout(entityAList)
        .then(processEntityBWithTimeout(entityBList));
}

private Mono<Void> processPhase2(List<EntityC> entityCList, List<EntityD> entityDList, List<EntityE> entityEList) {
    return processEntityCWithTimeout(entityCList)
        .then(processEntityDWithTimeout(entityDList))
        .then(processEntityEWithTimeout(entityEList));
}
```

그런데 `Phase1(매출+주문)`과 `Phase2(매출상세+영수증+승인정보)`로 나누고 보니, 단계별 완료/실패 지점을 명확히 구분할 수 있어 장애 영향 범위를 파악하기 쉬워졌습니다.<br>
운영 관점에서 추적 가능성과 재처리 단위를 선명하게 만든 정리 작업이 된 셈이었습니다. 앞으로도 이런 종류의 개선점이 보이면 일단 도전해봐야겠다고 다짐했습니다.

<br>

3개의 개선 작업을 진행하고, 달라진 점을 가시화 해보자면 다음과 같은 그림이 될 것입니다.

<p align="center">
  <img src="{{ site.baseurl }}/assets/img/posts/2026-03-05-config-tcp-server-refactoring/to-be.png" alt="TO-BE 구조" class="img-80">
  <br>
  <em>개선 작업 후 시퀀스 다이어그램</em>
</p>

# 개선 작업을 완료하며..

### 정량 결과

- 개선 전: 장애는 약 **3일~1개월 주기**로 반복 발생했고, 한 번 발생하면 DB 커넥션 불가 상태가 유지되어 **사실상 전체 요청 처리가 중단**되었습니다.
- 개선 후: 마지막 개선 반영 시점 이후 **장애 0건**을 달성했습니다.

<br>

위에서 설명하지 않은 작업 외에도, 부가적으로 다음 과정들이 있었습니다.
- 하드코딩되어 있던 데이터베이스 설정값 외부화, 커넥션 풀 warmup/cleanup/모니터링 추가
- 클라우드 서버 사양 업그레이드(2vCPU/2RAM -> 4vCPU/4RAM), DBaaS 데이터베이스 접근제어 설정 추가
- 과도하게 데이터베이스 커넥션 풀을 유지하던 외부 서버의 설정 수정(30개의 pool -> 10개의 pool)


이번 작업을 하면서, 그동안 막연하게 어렵게만 느꼈던 WebFlux/Netty를 처음부터 다시 읽어보는 계기가 되었고 개인적으로도 큰 공부가 되었습니다. <br>
특히 "왜 이렇게 동작하는가"를 코드와 로그로 함께 확인해보니, 단순 수정보다 운영 관점에서 설계를 보는 시야가 조금은 넓어진 것 같습니다.<br>
다음 단계로는 Netty 파이프라인 전면에 `HttpContentCompressor` 같은 압축 핸들러를 적용할 수 있는지 검토해, 응답 크기와 네트워크 비용 절감 효과를 실제 트래픽 기준으로 검증해보려 합니다.

<br><br>

긴 글 읽어주셔서 감사합니다!

---

참고 링크
- [Netty 및 작업 프로세스](https://ghkdqhrbals.github.io/portfolios/docs/Java/6/)
- [Netty Class Docs](https://netty.io/4.2/xref/index.html)
- [Project Reactor Docs](https://projectreactor.io/docs/core/release/reference/)
