---
layout: page
title: Resume
permalink: /resume/
page_class: resume-page
extra_css: resume.css
description: 김미림 백엔드 개발자 이력서
---
<article class="resume" markdown="1">

<div class="resume-actions" aria-label="Resume actions">

<button class="btn-primary" type="button" onclick="window.print()">PDF 저장/인쇄</button>
<button class="btn-primary" id="resume-photo-select" type="button">인쇄용 사진 선택</button>
<button class="btn-primary" id="resume-photo-remove" type="button" hidden>사진 제거</button>
<input id="resume-photo-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
<span id="resume-photo-status" role="status">사진은 인쇄 시에만 표시되며 새로고침하면 삭제됩니다.</span>

</div>

<fieldset class="resume-contact-inputs" autocomplete="off">
<legend>인쇄용 Contact</legend>
<p id="resume-contact-help">입력한 항목만 인쇄됩니다. 서버에 저장되지 않으며 새로고침하면 삭제됩니다.</p>
<label for="resume-contact-email">이메일</label>
<input id="resume-contact-email" type="email" autocomplete="off" aria-describedby="resume-contact-help" placeholder="name@example.com">
<label for="resume-contact-phone">전화번호</label>
<input id="resume-contact-phone" type="tel" autocomplete="off" aria-describedby="resume-contact-help" placeholder="010-1234-5678">
<label for="resume-contact-linkedin">LinkedIn</label>
<input id="resume-contact-linkedin" type="url" autocomplete="off" aria-describedby="resume-contact-help" placeholder="https://www.linkedin.com/in/…">
<button class="btn-primary" id="resume-contact-clear" type="button">연락처 지우기</button>
</fieldset>

<header class="resume-header" markdown="1">

# 김미림

Backend Engineer
{:.resume-role}

</header>

<section class="resume-section" markdown="1">

## Summary

Java/Spring 기반으로 결제·주문·POS 시스템을 개발하고 운영해 온 4년차 백엔드 엔지니어입니다.

동시성에 따른 데이터 정합성, 외부 API 지연, 제한된 리소스와 네트워크 단절 등 정상 흐름이 깨지는 상황에서 문제를 추적하고 처리 경계와 복구 흐름을 설계해 왔습니다. 운영 문제를 관측하고 재현한 뒤 구조 개선과 운영 검증까지 연결하는 것을 중요하게 생각합니다.

</section>

<section class="resume-section" markdown="1">

## Experience

<div class="resume-entry" markdown="1">

<div class="resume-entry__header" markdown="1">

### 한국밴서비스  Backend Engineer

**2023.08 ~ 현재**
{:.resume-date}

</div>

결제·주문·POS·매출·물류 시스템을 개발·운영하며 장애 대응, 데이터 정합성 개선, 외부 시스템 연동 및 내부 운영 시스템 현대화를 담당했습니다.

### Selected Projects

{:.resume-subsection-title}

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 매출 동기화 서버 안정화

**2024.10 ~ 2025.03 · 운영 관찰 ~ 2026.01**
{:.resume-date}

</div>

- 대용량 매출 동기화 중 서버 무응답과 R2DBC Connection Pool timeout이 반복되는 장애를 분석하고, 중첩 subscribe()를 제거해 flatMap 기반 단일 Reactive Chain으로 재구성
- DB 작업을 batch 50 단위로 제어하고 JsonObjectDecoder로 대용량 JSON 메시지 경계를 처리
- 실제 장애 데이터 기준 1,500+ 레코드 약 7초 처리, 개선 후 약 10개월간 동일 원인의 애플리케이션 장애 재발 없음
{:.resume-list}

Java · Spring Boot · WebFlux · Reactor Netty · R2DBC · MariaDB
{:.resume-tech}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 재고 반영 조건과 동시성 제어를 통한 정합성 개선

**2026.05 ~ 2026.07**
{:.resume-date}

</div>

- 주문·취소·반품·사고처리 시 수행되는 데이터베이스 재고 트리거를 검증해, 반품 접수 단계의 잘못된 재고 차감과 이미 처리된 상태에서 다른 정보가 수정될 때 재고가 중복 반영되는 조건 개선
- 주문 상태 관리 컬럼의 전후 비교를 통해 실제로 상태가 변경된 시점에만 재고가 반영되도록 트리거 재설계
- 동일 상품 주문 처리 전에 상품 데이터에 비관적 락을 적용해 동시 처리 구간을 직렬화하고, 동시성 재현 테스트와 약 1개월의 운영 모니터링으로 검증
{:.resume-list}

Java · Spring · MySQL/InnoDB
{:.resume-tech}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### OMS 외부 택배 API 비동기 처리

**2025.07 ~ 2025.08**
{:.resume-date}

</div>

- 주문 수량별 택배사 API 순차 호출에서 외부 응답 지연이 누적되어 관리자 요청이 최대 약 7초까지 대기하는 문제 분석
- 요청 데이터를 선행 저장하고 원래의 트랜잭션이 커밋된 후 @TransactionalEventListener(AFTER_COMMIT) + @Async로 외부 API 호출을 분리해, HTTP 요청과 데이터 저장 트랜잭션이 외부 응답을 기다리지 않도록 구성하고 요청 id와 MDC로 비동기 처리 과정 추적
- Polling 기반 결과 확인 및 수동 재처리 흐름을 구성해 Browser Network 기준 최대 약 7초 → 약 150~200ms, 개선 후 응답 지연 관련 민원 0건
{:.resume-list}

Java · Spring Boot · Spring Event · JPA · QueryDSL · MySQL
{:.resume-tech}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### POS 결제 상태 및 데이터 복구

**개발 진행 중**
{:.resume-date}

</div>

- 모바일 POS에서 NICE 결제 승인·앱 내부 처리·서버 동기화를 독립 lifecycle로 분리하고 ready → pending → paid → confirmed 결제 상태 모델 설계
- 결제 상태와 서버 동기화 상태를 분리하고 sent=false 데이터를 앱 시작 시 최대 500건 단위로 Background Sync
- 서버에서는 날짜 + 영수증번호 기준 Upsert를 적용해 응답 유실 후 동일 데이터 재전송 시 중복 row 생성 방지
{:.resume-list}

Flutter · Dart · Kotlin · SQLite · REST API · NICE 결제 SDK
{:.resume-tech}

</div>

</div>

<div class="resume-entry" markdown="1">

### Additional Experience

{:.resume-subsection-title}

<div class="resume-additional-entry" markdown="1">

**2026.07 ~ 2026.09 · 앱 푸시 알림 서버 구축** - FCM 발송부터 앱 수신 확인, 매장주 미수신 시 관리자 대체 알림(폴백), subscription 복구까지 관리하는 중앙 Push Server 구축

</div>

<div class="resume-additional-entry" markdown="1">

**2026.04 ~ 2026.08 · 무인매장 키오스크 현대화** - 하드웨어별 모듈과 Shell/UI 경계를 직접 설계하고 AI Agent와 분석·구현을 진행해 3개월 내 MVP 구축, 이후 1개월 간 실기기 검증·보완을 거쳐 운영 적용 및 자동 오류 감지·원격 진단 체계 구축

</div>

<div class="resume-additional-entry" markdown="1">

**2026.03 ~ 2026.06 · DeployX 배포 자동화** - CI 기반 빌드 산출물 업로드 자동화부터 Blue-Green 배포, Health Check 및 자동 Rollback까지 배포 Workflow 표준화

</div>

<div class="resume-additional-entry" markdown="1">

**2025.11 ~ 2026.01 · 그룹웨어 인증·권한 체계 확장** - JWT 기반 시스템 연동과 업체 단위 데이터 격리·ACL 구조 구축

</div>

<div class="resume-additional-entry" markdown="1">

**2025.04 ~ 2026.04 · 매출 ASP 웹·앱 구축 및 리뉴얼** - Spring 기반 웹 신규 구축과 Flutter 앱 리뉴얼, 계층형 권한 및 매출·상품 동기화 기능 개발

</div>

<div class="resume-additional-entry" markdown="1">

**2025.04 ~ 2025.07 · PDA 물류 앱 구축** - Dynamic Feature와 공통 Scanner Interface로 기기별 Scanner SDK를 분리해 전용 PDA와 일반 스마트폰 지원

</div>

<div class="resume-additional-entry" markdown="1">

**2025.05 · 모바일 앱 운영 경로 복구 및 재론칭** - 기존 앱의 배포 경로를 복구하고 Google Play 정책 및 Target API 변경 대응

</div>

<div class="resume-additional-entry" markdown="1">

**2024.06 ~ 2025.03 · 그룹웨어 레거시 현대화** - 분기 중심의 기존 구조를 계층화하고 SSR 중심 기능을 REST API 기반으로 점진적 전환

</div>

</div>

</section>

<section class="resume-section" markdown="1">

## Freelance Experience

<div class="resume-entry" markdown="1">

<div class="resume-entry__header" markdown="1">

### 프리랜서 Backend Engineer

**2022.07 ~ 2023.07**
{:.resume-date}

</div>

고객사 프로젝트에서 Backend 개발과 기존 시스템 분석, 외부 솔루션 연계 및 통합 테스트를 수행했습니다.

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### H.Point 통합 개발

**2023.04 ~ 2023.07**
{:.resume-date}

</div>

- 기존 적립 로직의 영향 범위를 최소화하면서 신규 결제 수단 및 VIP 마일리지 적립 조건을 연계하고 주요 시나리오 검증
{:.resume-list}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 골프 앱 고도화

**2023.02 ~ 2023.03**
{:.resume-date}

</div>

- 약 7개의 UNION과 복잡한 JOIN·형변환이 포함된 메인 조회 SQL을 개별 Query와 애플리케이션 병합 구조로 재설계
- 신규 인덱스 추가 없이 기존 인덱스를 활용할 수 있도록 개선해 Browser Network 기준 3~5분 → 약 350ms
{:.resume-list}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 신용보증재단 모바일 앱 구축

**2022.07 ~ 2023.01**
{:.resume-date}

</div>

- 신규 모바일 업무 서버·DB 구축 및 EAI·MCI·ECM 등 기존 시스템과의 연계 인터페이스 개발 참여
{:.resume-list}

</div>

</div>

</section>

<section class="resume-section" markdown="1">

## Skills

Core
: Java · Spring Boot · Spring Data JPA · MySQL · MariaDB

Reactive &amp; Network
: WebFlux · Reactor Netty · R2DBC · TCP

Data &amp; Persistence
: QueryDSL · MyBatis · SQLite

Additional
: Node.js · TypeScript · Kotlin · Flutter
{:.resume-skills}

</section>

<section class="resume-section" markdown="1">

## Education

<div class="resume-plain-list" markdown="1">

컴퓨터공학 학사 · 학점은행제  2022.08 · 4.17 / 4.5

한양여자대학교 정보경영과 전문학사  2021.01 · 3.98 / 4.5

</div>

</section>

<section class="resume-section" markdown="1">

## Certifications

<div class="resume-plain-list" markdown="1">

AWS Certified Developer - Associate · 2024

AWS Certified Solutions Architect - Associate · 2024

AWS Certified Cloud Practitioner · 2024

정보처리기사 · 2023

SQLD · 2022

</div>

</section>

</article>

<script src="{{ '/assets/js/resume-photo.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/resume-contact.js' | relative_url }}" defer></script>
