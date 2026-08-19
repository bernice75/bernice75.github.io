---
layout: post
title: "소켓 API보다 먼저 프로토콜을 문서화하자 - 생명주기, 에러 처리, 명세 (3)"
description: "Stephen Cleary의 TCP/IP .NET Sockets FAQ를 바탕으로, 소켓 생명주기와 에러 처리, 프로토콜 명세 문서의 필요성을 정리합니다."
date: 2026-08-18 09:20:00 +0900
author: "김미림"
header-img: assets/img/posts/2026-04-17-tcpip-sockets-faq-series/cover.png

categories:
  - Stephen Cleary
  - TCP/IP
  - Network
  - Backend
  - Architecture
---

이번 글은 Stephen Cleary의 **TCP/IP .NET Sockets FAQ** 시리즈를 읽으며 남겨두고 싶었던 마지막 정리입니다.<br>
1편에서 TCP 스트림과 메시지 프레이밍을, 2편에서 half-open connection과 타임아웃을 다뤘다면, 이번에는 조금 더 실무적인 질문으로 넘어가보려 합니다.

> 소켓 API를 아는 것과, 운영 가능한 프로토콜을 설계하는 것은 왜 다른가?

FAQ의 여러 하위 글을 읽고 나니, 결국 중요한 것은 메서드 이름 암기가 아니라 **소켓 생명주기와 실패 시나리오를 문서로 다루는 태도**라는 생각이 들었습니다.

<br>

## 시리즈 안내

1. [**1편**: TCP 스트림과 메시지 프레이밍]({% post_url 2026-04-17-tcpip-sockets-faq-series-1 %})
2. [**2편**: half-open connection과 타임아웃 설계]({% post_url 2026-04-29-tcpip-sockets-faq-series-2 %})
3. **3편**: 소켓 생명주기, 에러 처리, 프로토콜 문서화 (현재 글)

<br>

## 소켓은 역할에 따라 생명주기가 다르다

FAQ는 `Socket` 클래스를 설명하면서 client socket, server(listening) socket, connected socket을 구분합니다.<br>
이 구분은 단순 이론처럼 보이지만, 실무에서는 책임 분리를 판단하는 기준이 됩니다.

### 1. Client socket

클라이언트 소켓은 보통 다음 흐름을 가집니다.

1. 생성한다.
2. 서버 주소와 포트로 연결한다.
3. 연결이 성립되면 읽고 쓴다.
4. 종료 시 소켓을 닫는다.

핵심은 "연결 시도 실패"와 "연결 이후 실패"를 분리해 다뤄야 한다는 점입니다.<br>
사용자 알림, 재시도 간격, 최대 재시도 횟수는 여기서 정책이 갈립니다.

### 2. Server socket

서버의 listening socket은 직접 데이터를 읽고 쓰는 소켓이 아닙니다.<br>
정해진 포트에서 연결을 받아들이고, 실제 통신은 accept 이후 생성된 child socket이 맡습니다.

이 구조를 이해하면 다음이 분명해집니다.

1. 포트 바인딩 실패와 개별 연결 실패는 다른 문제다.
2. listening socket의 책임은 "연결 수락"이지 "업무 처리"가 아니다.
3. 연결 수락 이후 단계는 child socket 또는 세션 단위 코드로 분리해야 한다.

이 구분은 Netty에서도 거의 그대로 대응됩니다.<br>
부트스트랩/채널 초기화와 실제 inbound 처리 로직을 섞어버리면 장애 원인도 함께 섞입니다.

### 3. Connected socket

연결된 소켓은 실제 데이터를 주고받는 주체입니다.<br>
그리고 바로 이 지점에서 1편의 프레이밍 문제, 2편의 half-open 문제, 이번 글의 에러 처리 문제가 모두 한곳으로 모입니다.

즉 connected socket은 단순히 "연결된 상태"가 아니라, **프로토콜 약속과 실패 정책이 집행되는 실행 지점**입니다.

<link rel="stylesheet" href="{{ site.baseurl }}/assets/css/tcpip-socket-diagrams.css">

{% include diagrams/tcpip-protocol-design.html %}

<script defer src="{{ site.baseurl }}/assets/js/tcpip-socket-diagrams.js"></script>

<br>

## 모든 소켓 연산은 실패할 수 있다고 가정해야 한다

FAQ의 error handling 글은 아주 직설적입니다.<br>
소켓 연산은 즉시 끝나는 작업이든 네트워크를 기다리는 작업이든 모두 실패 가능성이 있습니다.

이 문장이 좋았던 이유는, 소켓 코드를 볼 때의 태도를 바로잡아주기 때문입니다.

1. connect는 실패할 수 있다.
2. send는 실패할 수 있다.
3. receive는 실패할 수 있다.
4. close조차 항상 기대한 타이밍대로 끝나지 않을 수 있다.

결국 "정상 흐름을 먼저 짜고 예외는 나중에 보자"는 접근이 가장 위험합니다.<br>
네트워크 프로그래밍에서는 오히려 **실패 경로가 본문이고 정상 경로가 한 갈래**에 가깝다는 생각이 들었습니다.

그래서 에러 처리에서 중요한 것은 catch 블록의 개수가 아니라 다음 두 가지였습니다.

1. 어떤 실패를 재시도 가능한 실패로 볼 것인가
2. 어떤 실패를 세션 종료 사유로 볼 것인가

이 구분이 없으면 모든 오류가 같은 로그 레벨로 섞이고, 운영자는 "그래서 이 연결은 닫아야 하나? 다시 붙여야 하나?"를 매번 사람 판단에 의존하게 됩니다.

<br>

## 애플리케이션 프로토콜 명세서는 선택이 아니라 운영 문서다

FAQ에서 제가 가장 공감한 주제는 **Application Protocol Specifications**였습니다.<br>
원문은 애플리케이션 프로토콜을 설계할 때 명세 문서를 반드시 두라고 권합니다.

왜 그럴까요?<br>
소켓 통신은 양쪽이 조금만 다르게 이해해도 곧바로 장애로 이어지기 때문입니다.

제가 이번에 다시 적어본 명세 항목은 다음과 같습니다.

1. 프로토콜 버전
2. 버전 협상 방식
3. 메시지 프레이밍 방식
4. 각 메시지 타입의 필드와 의미
5. 필수/선택 필드 구분
6. 최대 메시지 크기
7. 타임아웃 기준
8. heartbeat 유무와 주기
9. 에러 응답 형식
10. 재시도 가능/불가능 조건

읽다 보니 이 문서는 개발 편의 문서가 아니라, 사실상 **운영 계약서**에 가깝다는 생각이 들었습니다.<br>
특히 여러 클라이언트가 붙는 구조에서는 더 그렇습니다.<br>
서버만 바꾸면 끝나는 것이 아니라, 현장 단말과의 약속도 함께 관리해야 하기 때문입니다.

<br>

## "XML over TCP" 같은 표현만으로는 아무것도 정의되지 않는다

FAQ는 XML over TCP를 별도 글로 다루면서, "XML을 쓴다"는 말만으로는 실제 통신 규약이 정의되지 않는다고 짚습니다.<br>
이 부분은 JSON에도 거의 똑같이 적용됩니다.

예를 들어:

1. XML 또는 JSON 한 건의 끝은 어디인가
2. 여러 메시지를 연속으로 보낼 수 있는가
3. 인코딩은 무엇인가
4. 스키마 검증은 어디까지 하는가
5. 잘못된 문서가 오면 연결을 끊는가, 에러 메시지를 보내는가

즉 "포맷"을 정한 것과 "프로토콜"을 정한 것은 다른 문제입니다.<br>
이 차이를 흐리게 보면, 결국 프레이밍도 애매해지고 에러 처리도 임시방편이 됩니다.

<br>

## FAQ의 리소스 추천도 결국 같은 방향을 가리킨다

Stephen Cleary는 리소스 글에서 Stevens의 TCP/IP 서적과 WinSock FAQ를 추천합니다.<br>
흥미로웠던 점은, .NET 소켓 이야기를 하면서도 결국 더 아래 계층의 TCP 동작 원리를 이해해야 한다는 방향으로 안내한다는 점이었습니다.

저도 이 부분에 동의하게 되었습니다.<br>
프레임워크나 언어는 달라도, 아래 질문은 계속 남기 때문입니다.

1. 지금 보고 있는 문제는 프로토콜 문제인가
2. 소켓 사용 방식 문제인가
3. 네트워크 특성 문제인가
4. 운영 정책 부재 문제인가

언어별 API를 익히는 것만으로는 이 질문에 답하기 어렵고, 결국 TCP 자체에 대한 이해가 필요합니다.

<br>

## 시리즈를 마치며

이번 3편 시리즈를 정리하면서 제 머릿속에는 아래 문장이 남았습니다.

1. TCP는 메시지를 모른다.
2. 연결은 조용히 죽을 수 있다.
3. 소켓 API는 프로토콜 설계서를 대신해주지 않는다.

결국 운영 가능한 통신 시스템을 만들려면, 코드보다 먼저 다음이 분명해야 한다고 느꼈습니다.

1. 메시지 경계는 무엇인가
2. 언제 실패로 볼 것인가
3. 실패하면 어떻게 복구할 것인가
4. 이 약속을 문서로 어떻게 남길 것인가

이전 Netty 장애 글이 "문제를 어떻게 고쳤는가"에 가까웠다면, 이번 시리즈는 "앞으로 비슷한 문제를 만났을 때 어떤 질문부터 해야 하는가"를 정리한 기록에 더 가깝습니다.<br>
다음에 실제 프로토콜 명세서를 작성하게 된다면, 이번에 정리한 10개 항목을 기본 템플릿처럼 가져가 보려고 합니다.

---

참고 문헌

- Stephen Cleary, [TCP/IP .NET Sockets FAQ](https://blog.stephencleary.com/2009/04/tcpip-net-sockets-faq.html)
- Stephen Cleary, [Socket Operations](https://blog.stephencleary.com/2009/05/socket-operations.html)
- Stephen Cleary, [Error Handling](https://blog.stephencleary.com/2009/05/error-handling.html)
- Stephen Cleary, [Using Socket as a Client Socket](https://blog.stephencleary.com/2009/05/using-socket-as-client-socket.html)
- Stephen Cleary, [Using Socket as a Server (Listening) Socket](https://blog.stephencleary.com/2009/05/using-socket-as-server-listening-socket.html)
- Stephen Cleary, [Using Socket as a Connected Socket](https://blog.stephencleary.com/2009/06/using-socket-as-connected-socket.html)
- Stephen Cleary, [Application Protocol Specifications](https://blog.stephencleary.com/2009/06/application-protocol-specifications.html)
- Stephen Cleary, [XML over TCP/IP](https://blog.stephencleary.com/2009/07/xml-over-tcpip.html)
- Stephen Cleary, [TCP/IP Resources](https://blog.stephencleary.com/2009/05/tcpip-resources.html)
