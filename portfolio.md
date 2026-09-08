---
layout: page
title: Portfolio
permalink: /portfolio/
page_class: resume-page portfolio-page
description: 김미림 백엔드 개발자 프로젝트 포트폴리오
---

<article class="resume portfolio" markdown="1">
  <div class="resume-actions" aria-label="Portfolio actions">
    <button class="btn-primary" type="button" onclick="window.print()">PDF 저장/인쇄</button>
  </div>

# 김미림 \| Backend Engineer

**Core** Java · Spring Boot · Spring Data JPA · MySQL · MariaDB · WebFlux · Reactor Netty
{:.portfolio-summary-line}

**Engineering Focus** Transaction & Concurrency · Async Processing · TCP/Network · External API Integration · Failure Recovery
{:.portfolio-summary-line}

Java/Spring 기반으로 결제·주문·POS 시스템을 개발하고 운영하며, 장애·동시성·데이터 정합성·비동기 처리 문제를 구조적으로 해결해 온 백엔드 엔지니어입니다.

정상 흐름을 구현하는 것에 그치지 않고, 실제 운영에서 실패와 중복이 발생했을 때 데이터와 서비스가 어떻게 복구될지를 중요하게 생각합니다.

운영 문제를 로그와 데이터로 관측하고 재현한 뒤 원인을 분석하고, 처리 경계를 다시 설계해 운영에서 확인될 때까지 개선하는 방식으로 문제를 해결해 왔습니다.

## Selected Projects

### 01. 매출 동기화 서버 안정화

**2024.10 ~ 2025.03 · 운영 관찰 ~ 2026.01**
{:.portfolio-meta}

**Java · Spring Boot · WebFlux · Reactor Netty · R2DBC · MariaDB**
{:.portfolio-tech}

#### Problem & Investigation

키오스크의 매출 데이터를 TCP로 동기화하는 서버에서 대용량 메시지 처리 중 서버가 응답하지 않고, R2DBC Connection Pool acquisition timeout이 반복되는 문제가 있었습니다.

실제 장애 시점의 데이터를 추출해 동일한 조건으로 재현하면서 Reactive 처리 흐름을 추적했습니다. 이 과정에서 중첩 subscribe()로 인해 비동기 작업의 lifecycle과 error propagation이 상위 흐름에서 분리되어 있고, DB 작업의 동시 실행 범위를 제어하기 어려운 구조를 확인했습니다. 이에 처리 흐름과 DB 작업 범위를 함께 재설계했습니다.

#### Improvement

중첩 subscribe()를 제거하고 flatMap 기반의 단일 Reactive Chain으로 처리 흐름을 재구성했습니다.

DB 작업은 batch 50 단위로 실행 범위를 제어했으며, 대용량 JSON 메시지의 경계를 안정적으로 처리하기 위해 JsonObjectDecoder를 적용했습니다.

#### Result

실제 장애 데이터를 기준으로 1,500+ 레코드를 약 7초 내 처리하는 것을 확인했습니다.

개선 이후 약 10개월간 동일 원인의 애플리케이션 장애가 재발하지 않았으며, 운영 환경에서 개선 효과를 지속적으로 검증했습니다.

---

### 02. 재고 반영 조건과 동시성 제어를 통한 정합성 개선

**2026.05 ~ 2026.07**
{:.portfolio-meta}

**Java · Spring · MySQL/InnoDB**
{:.portfolio-tech}

#### Problem

주문·취소·반품·사고처리 과정에서 재고가 실제 업무 상태와 맞지 않는 문제가 발생했습니다.

기존 Trigger를 검증한 결과 반품 접수 단계에서도 재고가 차감되는 조건이 존재했고, 이미 재고 반영이 끝난 상태에서도 다른 UPDATE가 발생하면 재고 증감 로직이 다시 실행될 수 있었습니다. 동일 상품을 여러 직원이 동시에 주문하는 상황에서도 기대한 재고 차감과 실제 결과가 일치하지 않는 사례가 확인되었습니다.

#### Improvement

주문 상태 관리 컬럼의 변경 전 값과 변경 후 값을 비교해 실제 상태가 변경되고 재고 반영이 필요한 경우에만 Trigger가 동작하도록 재설계했습니다. 이를 통해 불필요한 재고 반영을 막았습니다.

동일 상품의 동시 주문 처리에서는 주문 상세 저장 전에 상품 레코드에 비관적 락을 적용해 해당 상품의 처리 구간을 직렬화했습니다.

#### Verification

동일 상품에 대한 동시 주문 시나리오를 재현해 개선된 처리 흐름을 검증했습니다. 배포 이후 약 1개월간 재고 변화를 모니터링했으며 동일 현상의 재발이 없음을 확인했습니다.

---

### 03. OMS 외부 택배 API 비동기 처리

**2025.07 ~ 2025.08 · OMS 구축 2023.08 ~ 2024.02**
{:.portfolio-meta}

**Java · Spring Boot · Spring Event · JPA · QueryDSL · MySQL**
{:.portfolio-tech}

#### Problem

기존에 구축한 OMS에서 송장 등록 시 주문 수량만큼 외부 택배사 API를 순차 호출하고 있었습니다. 외부 API의 응답이 느려지면 지연 시간이 누적됐고 관리자 HTTP 요청이 최대 약 7초까지 대기했습니다. 외부 API 호출이 요청 처리와 같은 트랜잭션 경계 안에서 실행되어 외부 시스템의 응답시간이 내부 처리 흐름에 직접 영향을 주는 구조였습니다.

#### Architecture

요청 데이터를 먼저 DB에 저장하고 원래의 트랜잭션이 정상적으로 커밋된 이후 @TransactionalEventListener(AFTER_COMMIT)와 @Async를 통해 외부 API 처리를 시작하도록 변경했습니다.

외부 API 호출 자체는 순차 처리하되 HTTP 요청과 원래의 트랜잭션 경계에서 분리했습니다. 각 요청은 request-id와 MDC로 추적하고, 마지막 API 처리 시 누적된 결과를 판단해 request-id 단위의 최종 성공·실패 상태를 저장하도록 구성했습니다.

클라이언트는 Polling으로 처리 결과를 확인하며 실패하거나 완료되지 않은 작업은 관리 화면에서 확인하고 수동으로 재처리할 수 있도록 했습니다.

#### Result

Browser Network 기준 관리자 요청의 응답시간을 최대 약 7초에서 약 150~200ms로 단축했습니다.

외부 시스템의 지연이 사용자 요청과 데이터 저장 작업을 장시간 점유하지 않도록 처리 경계를 분리했으며, 개선 이후 응답 지연 관련 민원은 0건이었습니다.

---

### 04. POS 결제 상태 및 데이터 복구

**개발 진행 중**
{:.portfolio-meta}

**Flutter · Dart · Kotlin · SQLite · REST API · NICE 결제 SDK**
{:.portfolio-tech}

#### State Design

모바일 POS에서는 NICE 결제 승인, 앱 내부 처리, 서버 동기화가 각각 다른 시점에 실패할 수 있습니다. 이를 하나의 성공/실패 상태로 관리하지 않고 결제 lifecycle을 ready → pending → paid → confirmed로 분리했습니다.

결제 요청 전에 주문·결제 정보를 로컬에 저장하고 pending으로 전환합니다. NICE 승인이 완료된 후 승인 데이터까지 로컬에 정상적으로 저장되어야 paid, 이후 앱 내부 후처리가 완료되어야 confirmed가 됩니다.

#### Recovery

NICE 승인은 성공했지만 승인정보 저장에 실패한 경우에는 결제를 완료 상태로 전환하지 않고 NICE 승인 이력을 확인하거나 취소할 수 있는 상태를 유지합니다.

서버 동기화 여부는 결제 상태와 별도의 sent 값으로 관리합니다. 미전송 데이터는 sent=false로 유지하고 앱 시작 시 최대 500건 단위로 Background Sync하여 네트워크 단절 이후에도 서버 전송을 다시 수행할 수 있도록 설계했습니다.

#### Idempotency

서버 반영에는 날짜 + 영수증번호를 기준으로 Upsert를 적용했습니다. 서버에는 정상 반영됐지만 클라이언트가 응답을 받지 못한 경우 동일 데이터를 다시 전송하더라도 새로운 row를 생성하지 않도록 해 재전송에 따른 중복 데이터 생성을 방지했습니다.

결제 SDK 연동 과정에서 Flutter가 Android Broadcast Intent를 직접 수신하기 어려운 제약을 해결하기 위해, Android 네이티브(Kotlin) 영역에서 SDK 이벤트를 처리하고 MethodChannel을 통해 Flutter와 통신하도록 구현했습니다.

---

### 05. 앱 푸시 알림 서버 설계 및 구축

**2026.07 ~ 2026.09 · 운영 중**
{:.portfolio-meta}

**Node.js · MariaDB · Firebase Cloud Messaging · JWT · Scheduler**
{:.portfolio-tech}

#### Architecture

사내 여러 시스템에서 공통으로 사용할 수 있는 중앙 Push Server를 구축했습니다. 알림 생성부터 구독 정보, FCM 발송 결과, 앱 수신 확인, 관리자 대체 알림 이력까지 서버에서 관리합니다.

무인매장 키오스크 장애 알림은 무인매장 키오스크 → Push Server → FCM → 매출 ASP App → 앱 수신 확인 흐름으로 운영되며, FCM 발송 성공을 실제 앱 수신과 동일하게 취급하지 않고 각각의 상태를 분리했습니다.

#### Reliability

FCM Token은 암호화해 저장하고 별도의 Hash 값을 이용해 동일 Token을 판별합니다. 앱이 Push를 수신하면 서버에 앱 수신 확인 정보를 전달하며, 필수 알림의 앱 수신 확인이 일정 시간 내 도착하지 않으면 매장주 대신 관리자에게 대체 알림(폴백)을 전송합니다.

FCM 발송과 발송 이력 저장 순서 때문에 즉시 도착한 앱 수신 확인을 찾지 못하는 타이밍 이슈를 발견해 recipient/delivery 상태를 도입했습니다. 상태 이력을 발송 전에 먼저 생성하고, 발송 결과에 따라 해당 이력을 갱신하도록 변경했습니다. 구독이 복구된 경우에는 최근 48시간 내 전송 실패 캠페인을 다시 확인해 전달할 수 있도록 구성했습니다.

#### Operational Findings

실제 운영 과정에서 앱 수신 확인 시간과 발송 시간의 UTC/KST 기준이 달라 관리자 대체 알림 판단이 잘못되는 문제를 발견했고 시간 기준을 통일했습니다.

특정 키오스크 한 대에서 필수 오류 알림이 반복되는 현상을 운영 데이터로 확인하고, 중복 알림을 방지하기 위해 cooldown을 적용했습니다. 발신 시스템 → FCM → 수신 앱 → 앱 수신 확인까지 전체 전달 lifecycle을 관찰할 수 있는 구조를 구축했습니다.

---

### 06. DeployX - 배포 자동화 및 안전한 복구 체계 구축

**2026.03 ~ 2026.06**
{:.portfolio-meta}

**Node.js · React · TypeScript · SSH · Apache HTTP Server**
{:.portfolio-tech}

#### Deployment

기존에는 서버에 SSH로 접속해 애플리케이션을 중지하고 JAR를 교체한 뒤 다시 실행하는 방식으로 배포했습니다. 문제가 발생하면 복구 과정이 사용자에게 그대로 노출될 수 있었습니다.

DeployX에서는 업로드된 Artifact를 비활성 Port에 먼저 실행하고 정상 여부를 확인한 이후 Apache Proxy를 새 인스턴스로 전환하도록 구성했습니다. 흐름은 배포 파일 준비 → 새 인스턴스 실행 → 정상 동작 확인 → 프록시 전환 → 기존 프로세스 종료 입니다.

CI Token을 발급해 CI 파이프라인에서 생성된 빌드 산출물을 DeployX로 전달할 수 있는 연동 인터페이스도 구성했습니다.

#### Recovery

배포 단계별 상태를 관리하고 중간 단계에서 실패하면 기존 서비스로 되돌릴 수 있도록 Rollback 흐름을 구성했습니다. 배포 결과와 로그를 DB에 남기고 필요할 경우 로그를 내려받아 실패 지점을 확인할 수 있도록 했습니다.

#### Result

수동 SSH 배포에서 반복되던 명령과 복구 절차를 하나의 Workflow로 표준화했습니다. 실제 사용에서는 Health Check를 포함해 통상 3분 이내에 배포가 완료됐으며, 새 프로세스의 정상 실행을 확인한 후 Proxy를 전환하는 방식으로 운영하고 있습니다.

---

### 07. 무인매장 키오스크 현대화 및 운영 체계 개선

**2026.04 ~ 2026.08 · 운영 및 유지보수 중**
{:.portfolio-meta}

**Electron · React · TypeScript · MySQL · REST API · Self-hosted RustDesk**
{:.portfolio-tech}

#### Rebuild

기존 C# 키오스크를 AI Agent와 함께 분석해 하드웨어별 통신 규격, 정상 응답 판별 조건과 예외 처리 흐름을 파악했습니다. 기존 코드는 하드웨어 연동 규격을 확인하는 기준으로 활용하고, 변경된 DB 스키마와 신규 요구사항에 맞춰 Electron 기반 애플리케이션 구조는 새로 설계했습니다.

하드웨어별 연동 모듈을 분리하고 장치와 직접 통신하는 영역과 UI의 경계를 분리해 특정 장치의 구현과 오류가 다른 영역으로 확산되지 않도록 구성했습니다. 예외 역시 사용자 영향에 따라 로그만 남길 오류와 즉시 안내가 필요한 오류를 구분했습니다.

페이지와 기능 단위로 구현 범위를 나눠 AI Agent를 구현에 활용하고, 실기기 통합 테스트를 통해 하드웨어 통신·결제 데이터 저장·예외 처리·자원 반납을 검증했습니다. Windows 7이 남아 있는 운영 환경을 고려해 호환 버전과 최신 Windows용 버전도 분리했습니다.

#### Operations

기존에는 키오스크 문제가 발생하면 고객 문의 이후 관리자가 상황을 인지하는 경우가 많았습니다. 신규 키오스크에서는 상품·현금 모듈·카드 결제·결제 데이터 생성·영수증 출력 등의 오류를 감지해 Push Server로 전달하도록 했습니다.

문제 확인이 필요한 경우 관리자는 셀프 호스팅으로 운영 중인 원격 프로그램을 통해 원격 진단하고 필요한 로그를 확보할 수 있도록 해, 현장 출동 전에 문제 상황을 확인할 수 있는 운영 흐름을 구성했습니다.

#### Result

React와 Electron에 익숙하지 않은 상황에서도 AI Agent를 레거시 분석과 기능 단위 구현에 활용해 약 3개월 만에 MVP를 구현했으며, 이후 1개월 이내에 실기기 검증과 보완을 거쳐 운영에 적용했습니다.

전체 관리 대상은 40개 이상의 매장이며 Electron 기반 신규 키오스크는 약 10개 매장에 적용한 뒤 순차적으로 전환하고 있습니다. 

구구축은 2026.08에 완료했으며 현재는 신규 기능 추가와 유지보수를 진행하고 있습니다.

---

### 08. 골프 앱 메인 조회 API 성능 최적화

**2023.02 ~ 2023.03 · Freelance**
{:.portfolio-meta}

**Java · Spring · MariaDB · MyBatis**
{:.portfolio-tech}

#### Investigation

메인 화면에서 최근 예약과 스코어 이력을 조회하는 API가 3~5분까지 소요돼 실제 앱 사용이 어려운 상태였습니다. 기존 SQL을 분석한 결과 약 7개의 UNION, 다수의 JOIN과 형변환이 하나의 Query에 포함되어 있었습니다.

실행계획과 기존 인덱스를 확인한 결과 새로운 인덱스를 추가하기보다 데이터 조회 구조 자체를 단순화하는 방향으로 접근했습니다.

#### Redesign

하나의 거대한 SQL에서 모든 데이터를 조합하던 구조를 여러 개의 단순 Query로 분리했습니다. 각 Query가 기존 인덱스를 활용할 수 있도록 불필요한 형변환을 제거하고, 서로 다른 조회 결과의 조합이 필요한 부분은 애플리케이션에서 처리하도록 변경했습니다.

#### Result

별도의 신규 인덱스 추가 없이 Browser Network 기준 응답시간을 3~5분에서 약 350ms로 단축했습니다.

## Professional Experience

### 한국밴서비스 \| Backend Engineer

**2023.08 ~ 현재**
{:.portfolio-meta}

결제·주문·POS·매출·물류 시스템을 개발하고 운영하며 장애 대응, 데이터 정합성 개선, 외부 시스템 연동 및 내부 운영 시스템 현대화를 담당했습니다.

### 운영 및 시스템 구축·개선

#### 그룹웨어 인증·권한 체계 확장

**2025.11 ~ 2026.01**
{:.portfolio-meta}

그룹웨어와 매출 ASP의 JWT 기반 인증 연동을 구성하고, 업체 단위 데이터 격리와 ACL을 적용해 외부 업체까지 사용할 수 있도록 권한 구조를 확장했습니다.

#### 매출 ASP 웹·앱 구축 및 리뉴얼

**2025.04 ~ 2026.04 · 운영 관찰 2026.05 ~ 현재**
{:.portfolio-meta}

Java/Spring 기반 매출 ASP 웹을 새로 구축하고 기존 앱을 Flutter 기반으로 리뉴얼했습니다. 계층형 권한과 매출·상품 조회 기능을 웹과 앱에 구현했으며, 이후 매출 ASP App을 Push Server의 알림 수신 클라이언트로 연계했습니다.

#### PDA 물류 앱 구축

**2025.04 ~ 2025.07**
{:.portfolio-meta}

전용 PDA와 일반 스마트폰을 함께 지원하는 물류 앱을 구축했습니다. Dynamic Feature와 공통 Scanner Interface를 이용해 장비별 Scanner SDK의 차이를 분리했습니다.

#### 모바일 앱 운영 경로 복구 및 재론칭

**2025.05**
{:.portfolio-meta}

기존 모바일 앱의 배포 경로를 복구하고 Google Play 정책과 Target API 변경에 대응해 다시 운영 가능한 상태로 전환했습니다.

#### 그룹웨어 레거시 시스템 현대화

**2024.06 ~ 2025.03**
{:.portfolio-meta}

분기 중심의 기존 구조를 계층화하고 SSR 중심 기능을 REST API 기반으로 점진적으로 전환했습니다. 일정·수금·계약서 등 내부 업무 기능도 지속적으로 개선했습니다.

## Freelance Experience

### Freelance Backend Engineer

**2022.07 ~ 2023.07**
{:.portfolio-meta}

고객사 프로젝트에서 Backend 개발과 기존 시스템 분석, 외부 솔루션 연계 및 통합 테스트를 수행했습니다.

#### H.Point 통합 개발

**2023.04 ~ 2023.07**
{:.portfolio-meta}

기존 적립 로직의 영향 범위를 최소화하면서 신규 결제 수단 및 VIP 마일리지 적립 조건을 연계하고 주요 시나리오를 검증했습니다.

#### 골프 앱 고도화

**2023.02 ~ 2023.03**
{:.portfolio-meta}

메인 조회 데이터 구조를 개별 Query와 애플리케이션 조합 방식으로 재설계해 Browser Network 기준 응답시간을 3~5분에서 약 350ms로 개선했습니다.

#### 신용보증재단 모바일 앱 구축

**2022.07 ~ 2023.01**
{:.portfolio-meta}

신규 모바일 업무 서버·DB 구축과 EAI·MCI·ECM 등 기존 시스템 연계 인터페이스 개발에 참여했습니다.

## Engineering Principles

### Failure-aware

외부 API·네트워크·DB·클라이언트는 독립적으로 실패할 수 있다고 보고 상태와 복구 경계를 설계합니다.

### Observable

운영 문제를 로그와 데이터로 관측하고 재현한 뒤, 개선 이후 실제 운영에서 재발 여부까지 확인합니다.

### Pragmatic

새로운 기술을 도입하기 전에 Transaction·동시성·리소스·데이터 lifecycle의 경계를 먼저 명확히 합니다.

</article>
