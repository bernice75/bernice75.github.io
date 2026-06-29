---
layout: page
title: Home
permalink: /home/
page_class: home-page
---

# Back-end Engineer | 김미림

운영 중인 시스템의 병목과 구조적 결함을 찾아내고, 재설계로 안정성을 높여 온 **4년차 백엔드 개발자 김미림**입니다.

Java/Spring 기반 서비스를 주로 개발해 왔고, 최근에는 WebFlux/Netty 환경의 장애 분석과 이벤트 기반 리팩터링까지 맡으며 처리 흐름, 트랜잭션 경계, 리소스 관리 전략을 중심으로 문제를 해결하고 있습니다.

<p class="about-actions">
  <a class="btn-primary" href="/resume/">이력서 보기</a>
  <a class="btn-primary" href="/portfolio/">포트폴리오 보기</a>
</p>

### 대표 사례 (Selected Work)

**1. 매출 동기화 Netty TCP 서버 안정화**

- **문제**: 약 3일~1개월 주기로 DB 커넥션 풀이 고갈되며 매출 ASP까지 영향을 주는 장애가 반복되었습니다.
- **접근**: `JsonObjectDecoder` 기반 프레이밍, 버퍼/타임아웃 제어, 중첩 `subscribe` 제거와 Reactor 체인 재구성으로 처리 흐름을 다시 설계했습니다.
- **결과**: 반복 장애의 재발을 막고, 수신-검증-동기화 플로우의 운영 안정성을 높였습니다.
- [포스팅 보기]({% post_url 2026-03-05-config-tcp-server-refactoring %})

**2. 동기 처리 루프를 이벤트 기반 비동기 처리로 전환**

- **문제**: 요청 1건 안에서 외부 API 호출과 응답 생성이 강하게 결합되어 응답 지연과 처리 추적 난이도가 커지고 있었습니다.
- **접근**: `ApplicationEventPublisher`와 `@TransactionalEventListener`를 활용해 요청 접수와 실제 처리를 분리하고, `requestId` 기반 추적 구조로 전환했습니다.
- **결과**: 응답 흐름과 백그라운드 처리의 경계가 명확해졌고, 운영 중 상태 추적과 후속 확장이 쉬운 구조를 만들었습니다.
- [포스팅 보기]({% post_url 2025-12-14-loop-to-event-refactoring %})

**3. 주문/운영 시스템 내재화 및 현장 업무 전산화**

- **문제**: 외부 솔루션 의존도가 높고 현장 업무가 수기 또는 분산된 방식으로 운영되어 리드타임과 오류 가능성이 컸습니다.
- **접근**: 주문 관리 시스템을 내재화하고 API를 구축했으며, 모바일 앱 도입을 포함한 현장 업무 전산화를 진행했습니다.
- **결과**: 외부 의존도를 낮추고, 현장 업무 처리 리드타임을 약 60% 단축했습니다.

**4. SSH 기반 사내 배포 프로세스 가시화 및 표준화**

- **문제**: 수동 SSH/SFTP 배포 방식은 진행 상태와 실패 지점을 즉시 파악하기 어려워 운영 대응이 늦어지고, 배포 절차도 담당자 경험에 의존하고 있었습니다.
- **접근**: SSH 기반 배포를 내부 서비스 형태로 정리하고, 배포 단계 상태값, 실시간 로그, 헬스체크 기반 완료 판정, 동시 배포 제어 구조를 설계했습니다.
- **결과**: 배포 과정을 추적 가능한 운영 흐름으로 전환해 장애 원인 파악과 후속 조치 속도를 높이고, 배포 절차를 표준화했습니다.
- [포스팅 보기]({% post_url 2026-03-31-ssh-deploy-visualization %})

### 기술 스택 (Tech Stack)

**주력**
: Java, Spring Boot 3.x, Spring Security, Spring Data JPA, MySQL

**경험 확장 영역**
: WebFlux, Netty, Flutter(Dart), React

**관심 분야**
: Event-Driven Architecture, 운영 안정성 개선, LLM 기반 기능 설계

### 경력 (Experience)

**(주)한국밴서비스 (Korea VAN Service)** | Backend Engineer | _2023.08 ~ 현재_
: 결제, 물류, 정산 시스템의 DX와 레거시 개선을 담당하며, 운영 이슈 해결과 내부 시스템 고도화를 주도했습니다.

- 그룹웨어 및 파트너 관리 시스템 개선
- 주문 관리 시스템 내재화 및 API 구축
- 매출 동기화 서버 구조 개선 및 운영 안정화
- SSH 기반 사내 배포 도구를 설계·구현하여 배포 상태 가시화, 실시간 로그 확인, 동시 배포 제어, 헬스체크 기반 검증 체계 구축
- 현장 업무 전산화 및 모바일 앱 도입

**프리랜서 (Freelancer)** | Backend Engineer | _2022.07 ~ 2023.07_
: 다양한 도메인의 서비스를 End-to-End로 개발하며 백엔드 중심의 실무 경험을 쌓았습니다.

- H.Point 통합 개발
- 그린자켓 앱 고도화
- 신용보증재단 모바일 앱 구축

### 자격증 (Certifications)

- AWS Certified Solutions Architect - Associate (SAA)
- AWS Certified Developer - Associate (DVA)
- AWS Certified Cloud Practitioner (CLF)
- 정보처리기사
- SQLD
