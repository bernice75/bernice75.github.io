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

Java/Spring 기반으로 결제·주문·POS 시스템을 개발·운영해 온 백엔드 엔지니어입니다.

새로운 도메인의 업무 흐름을 빠르게 이해하고 기존 운영 환경에 적응하는 데 강점이 있습니다. 입사 직후 주문 업무를 파악해 OMS를 단독 개발하며 3개월 내 MVP를 구현했고, 이후 3개월간 세부 조정과 추가 개발을 거쳐 정식 출시해 주문 취합·송장 접수·송장번호 등록의 수작업을 대체했습니다.

재고 반영 오류, 외부 API 지연, 대용량 동기화 장애를 개선하고 동시 처리에 따른 데이터 불일치 위험을 예방해 왔습니다. 데이터 정합성을 지키는 처리 구조와 복구 흐름을 설계하고 운영에서 검증합니다.

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

## Experience <span class="resume-total-experience">총 경력 4년 1개월</span>
{:#experience .resume-section-heading}

<div class="resume-entry" markdown="1">

<div class="resume-entry__header" markdown="1">

### 한국밴서비스  Backend Engineer

**2023.08 ~ 현재 (3년 1개월)**
{:.resume-date}

</div>

결제·주문·POS·매출·물류 시스템을 개발·운영하며 장애 대응, 데이터 정합성 개선, 외부 시스템 연동 및 내부 운영 시스템 현대화를 담당했습니다.

Java · Spring Boot · WebFlux · Reactor Netty · JPA · R2DBC · QueryDSL · MySQL · MariaDB · Flutter · Dart · Kotlin · SQLite
{:.resume-tech}

### Selected Projects
{:.resume-subsection-title}

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### OMS 신규 구축 및 운영 개선

**2023.08 ~ 2025.08**
{:.resume-date}

</div>

- **OMS 단독 구축:** 주문·관리 사이트와 택배사 API 연동을 개발해 3개월 내 MVP 구현, 추가 3개월 보완 후 2024.02 정식 출시
- **수작업 대체:** 주문 취합·건별 송장 접수를 시스템화하고, 송장번호 수기 입력을 버튼 한 번의 일별 조회·매핑·등록으로 전환. 주문자는 사이트에서 송장번호 직접 확인
- **운영 중 요구 확장:** 현업 담당자·의사결정권자와 보관·발송 대행 기준을 구체화하고, 기존 재고 컬럼과 별도 보관료 관리 스키마로 변경 범위를 줄여 상품 관리 확장
- **응답 지연 개선 · 2025.07 ~ 2025.08:** 주문 트랜잭션 커밋 후 외부 호출을 비동기로 분리하고 결과 조회·수동 재처리 구현. Browser Network 기준 최대 약 7초 → 약 150~200ms, 적용 후 1개월간 지연 민원 0건
{:.resume-list}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 매출 동기화 서버 안정화

**2024.10 ~ 2026.01**
{:.resume-date}

</div>

2024.10 ~ 2025.03 개발 및 개선 후, 2026.01까지 운영 관찰로 안정성 검증

- **안정성 확인:** 개선 후 2026.01까지 약 10개월간 동일 애플리케이션 장애 재발 없음. 증설 전 2코어·2GB RAM에서 약 3MB의 실제 데이터 1,500건 이상을 약 7초에 처리하고, 커넥션 풀 로그로 작업 후 반환 확인
- **원인 조사·흐름 통합:** 키오스크 매출 동기화 서버와 DB를 공유하는 기존 매출 ASP의 로그인 장애를 조사해 미완료 작업 누적·커넥션 반환 지연을 원인 가설로 수립. 작업 완료·오류를 상위 흐름에 연결하고, DB 작업량 조정과 서버 증설(4코어·4GB RAM)도 수행
- **대용량 수신 보완:** JSON 구조 기반 경계 처리와 최대 메시지 크기 3MB 설정 적용. 기존 코드의 장애 재현 대신 개선 후 처리와 운영 상태 검증
{:.resume-list}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### 재고 반영 조건과 동시성 제어를 통한 정합성 개선

**2026.05 ~ 2026.07**
{:.resume-date}

</div>

- 재고 1개 부족 문의에서 주문·반품 및 월별 입출고·매출 내역을 대조해 반품 접수 단계의 잘못된 재고 차감 원인 규명·수정
- 주문 상태의 변경 전후 값과 재고 반영 조건을 함께 확인하도록 트리거를 재설계해 중복 반영 위험 예방
- 낙관적 락도 검토했으나, 트리거 기반 재고 증감과 잠금의 제어 지점을 DB로 맞추고 동일 상품의 주문 처리 구간을 직렬화하기 위해 주문 상세 저장 전 상품 레코드에 비관적 락 적용
- 주문·발송·반품 단계별 재고 증감을 확인하고, 운영 DB 복제 환경의 동시 주문 테스트로 최종 재고 검증. 배포 후 약 1개월치 주문 전후 로그 확인 및 추가 재고 불일치 신고 없음
{:.resume-list}

</div>

<div class="resume-project" markdown="1">

<div class="resume-entry__header" markdown="1">

#### POS 결제 상태 및 데이터 복구

**개발 진행 중**
{:.resume-date}

</div>

- 카드 승인 결과와 POS 성공·실패 표시가 어긋나는 문제에 대응해 결제 데이터 중심으로 승인 정보를 매핑하고, 사전 저장(pending) → 승인 정보 저장(paid) → 거래 상태 정리(confirmed)로 단계 분리
- 승인 실패·내부 예외 시 사전 저장 데이터를 제거하고 장바구니로 복귀하며, 이미 발생한 외부 승인은 별도 조회 화면에서 확인·취소할 수 있도록 복구 경로 구성
- 결제 상태와 서버 전송 여부를 분리해 앱 시작 시 미전송 데이터를 최대 500건 단위로 동기화하고 연결 복구 확인 후 재전송. 날짜·영수증번호 기준 Upsert로 중복 행 생성 방지
- 실제 단말의 승인 거절·VAN 응답 후 예외 주입으로 로컬 복구와 완료 오표시 방지·승인 거래 수동 취소를 확인하고, 네트워크 복구 후 재전송 및 동일 거래 재전송 시 1행 유지 검증
{:.resume-list}

상태 구분과 복구 경로 구현 완료. 앱 재실행 시 미완료 후처리의 자동 재개는 미구현

</div>

</div>

<div class="resume-entry" markdown="1">

### Additional Experience
{:.resume-subsection-title}

<div class="resume-additional-entry" markdown="1">

**2026.07 ~ 2026.09 · 앱 푸시 알림 서버 구축** - 키오스크 장애 알림 서버를 구축해 매장주·담당자 대체 수신과 구독 복구 후 재전송 검증. AI 분석을 실제 데이터와 대조해 수신 확인 처리 오류를 개선하고 중복 알림 억제 확인

48시간마다 수신 미확인 필수 알림을 스캔하는 대체 발송 경로는 구현 완료, 실제 대상 건 검증 전

</div>

<div class="resume-additional-entry" markdown="1">

**2026.04 ~ 2026.08 · 무인매장 키오스크 현대화** - 운영 지식 소실·매출 조회 분산에 대응해 재구축을 제안·주도. 이미 이해한 대체 프로그램의 스키마에 맞춰 매출 데이터 연계를 유지하고, 직접 설계한 구조에 AI 분석·구현을 활용해 약 3개월 내 MVP·추가 1개월 내 검증·보완 후 약 10개 매장에 적용

</div>

<div class="resume-additional-entry" markdown="1">

**2026.03 ~ 2026.06 · DeployX 배포 자동화** - 수동 배포의 오류 위험과 복구 부담을 줄일 자동화 환경을 제안·주도하고 AI를 계획·설계 검토·구현에 활용. 서비스 3개의 실제 운영 배포에서 업로드부터 기동·내외부 HTTP 응답 검증과 기존 인스턴스 종료까지 서비스별 3분 이내 완료 확인

실패 시 기존 포트로 복구하는 로직은 구현 완료, 의도적 실패 주입 테스트는 미수행

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

**2022.07 ~ 2023.07 (1년)**
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

- 신규 인덱스 추가 없이 동일 환경의 Browser Network 기준 메인 조회 응답시간 3~5분 → 약 350ms로 단축하고, 현업 담당자와 화면 데이터 정상 표시 확인
- 호출 경로·실행계획을 추적해 풀스캔과 상세 화면 쿼리 재사용으로 인한 불필요한 조회 확인. 메인 요약에 필요한 항목만 남기도록 컬럼·JOIN·하위 쿼리·형변환을 정리하고, UNION을 개별 쿼리와 애플리케이션 결과 조합으로 재구성
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
