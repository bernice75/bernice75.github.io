# 블로그 포스팅 작업 가이드 (Jekyll)

이 문서는 `bernice75.github.io`에서 새 포스트를 올릴 때 재사용할 작업 절차입니다.

## 1) 사전 준비

1. 루트에서 의존성 확인
```powershell
bundle check
```
2. 누락 시 설치
```powershell
$env:BUNDLE_USER_HOME = (Join-Path (Get-Location) '.bundle_home')
bundle install
```

참고: 현재 환경(Ruby 3.4)에서는 `Gemfile`에 아래 gem이 있어야 서버가 정상 기동됩니다.
- `base64`
- `bigdecimal`
- `kramdown-parser-gfm`

## 2) 새 글 파일 생성

1. 파일 위치/이름 규칙
- `_posts/YYYY-MM-DD-title.md`

2. Front matter 필수 항목 예시
```yaml
---
layout: post
title: "글 제목"
description: "요약"
date: 2026-03-05 10:30:00 +0900
author: "Bernice"
header-img: assets/img/posts/YYYY-MM-DD-title/cover.png
categories:
  - Backend
  - Java
---
```

중요:
- `date`에는 반드시 타임존(`+0900`)을 포함합니다.
- 타임존이 없으면 Jekyll이 `future date`로 판단해 목록에서 빠질 수 있습니다.

## 3) 이미지/자산 배치

1. 본문 이미지 경로
- `assets/img/posts/YYYY-MM-DD-title/...`

2. 본문에서 참조
```md
![설명]({{ site.baseurl }}/assets/img/posts/YYYY-MM-DD-title/image.png)
```

## 4) 로컬 실행 및 확인

1. 서버 실행
```powershell
$env:BUNDLE_USER_HOME = (Join-Path (Get-Location) '.bundle_home')
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

2. 확인 URL
- 목록: `http://127.0.0.1:4000/blog/`
- 상세: 생성된 post permalink

3. 빌드 로그로 누락 원인 확인
```powershell
$env:BUNDLE_USER_HOME = (Join-Path (Get-Location) '.bundle_home')
bundle exec jekyll build --verbose
```

## 5) 이번 작업에서 실제 발생한 이슈/해결

1. 증상: 새 글이 목록에 보이지 않음
- 원인: `Skipping ... has a future date`
- 해결: post `date`에 `+0900` 추가

2. 증상: Windows에서 bundler/gemspec 오류 (`git ls-files -z` 권한 문제)
- 해결: `simpol-jekyll-theme.gemspec`에 Windows fallback(Dir.glob) 적용

3. 증상: Ruby 3.4에서 `cannot load such file -- base64/bigdecimal`
- 해결: `Gemfile`에 `base64`, `bigdecimal` 추가 후 `bundle install`

4. 증상: `kramdown-parser-gfm` 누락으로 build 실패
- 해결: `Gemfile`에 `kramdown-parser-gfm` 추가 후 `bundle install`

## 6) 게시 전 체크리스트

- [ ] `_posts` 파일명 규칙 준수
- [ ] Front matter `date`에 `+0900` 포함
- [ ] `header-img` 실제 파일 존재
- [ ] `bundle exec jekyll build --verbose` 에러 없음
- [ ] `/blog/` 목록에 새 글 표시 확인
- [ ] 글 상세 페이지에서 이미지 깨짐 없음
