---
layout: page
title: Home
permalink: /home/
page_class: home-page
---
# 김미림 | Backend Engineer

**실패 상황까지 고려해** **안정적인 시스템을 설계합니다.**

Java/Spring 기반으로 결제·주문·POS 시스템을 개발하고 운영해 온 백엔드 엔지니어입니다.

동시성에 따른 데이터 정합성, 외부 API 지연, 제한된 리소스와 네트워크 단절처럼 정상 흐름이 깨지는 상황에서 문제를 추적하고, 처리 경계와 복구 흐름을 설계해 왔습니다.

## Engineering Focus

### Reliability

운영 장애를 로그와 실제 데이터로 재현하고 원인을 좁힌 뒤, 개선 이후 운영에서 재발 여부까지 확인합니다.

### Consistency

주문·결제의 Transaction, 상태 변화와 동시 처리 경계를 설계해 데이터 정합성을 지킵니다.

### Failure Recovery

외부 API와 네트워크가 실패할 수 있음을 전제로 상태와 복구 흐름을 설계합니다.

## Selected Work

### 매출 동기화 서버 안정화

대용량 매출 동기화 중 반복되던 서버 무응답과 R2DBC Connection Pool timeout을 분석하고 Reactive 처리 흐름과 DB 작업 범위를 재설계했습니다.

**1,500+ records / 약 7초 · 약 10개월 동일 원인 재발 없음**

### 재고 반영 조건과 동시성 제어를 통한 정합성 개선

주문·취소·반품·사고처리 상태에 따라 재고가 정확히 반영되도록 조건을 재설계하고, 동일 상품의 동시 주문 처리 구간을 직렬화했습니다.

**재고 반영 조건 재설계 · 동시 주문 재현 테스트 및 운영 검증**

### OMS 외부 택배 API 비동기 처리

외부 택배 API 지연이 사용자 요청과 데이터 저장 작업을 붙잡지 않도록 분리하고 요청 id 단위로 처리 결과를 추적하도록 개선했습니다.

**최대 약 7초 → 약 150~200ms · 응답 지연 민원 0건**

### POS 결제 상태 및 데이터 복구

모바일 POS에서 NICE 결제 승인, 앱 내부 처리, 서버 동기화를 별도 lifecycle로 분리해 네트워크 단절 이후에도 복구 가능한 흐름을 설계하고 있습니다.

**Background Sync · 재전송 중복 방지**

## Experience

**한국밴서비스 \| Backend Engineer \| 2023.08 ~ 현재**

**프리랜서 \| Backend Engineer \| 2022.07 ~ 2023.07**

## Tech Stack

**Backend**  Java · Spring Boot · Spring Data JPA · WebFlux · Reactor Netty

**Data**  MySQL · MariaDB · R2DBC · QueryDSL · MyBatis · SQLite

**Additional**  Node.js · TypeScript · Kotlin · Flutter

## Contact

문제를 발견하는 것에서 끝내지 않고, 운영에서 확인될 때까지 개선합니다.
