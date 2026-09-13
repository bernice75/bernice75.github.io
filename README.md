# bernice75.github.io

이 저장소는 개인 블로그 활동을 위해 제작·운영되고 있습니다.

작성자가 직접 제작한 글, 이미지 및 기타 콘텐츠는 사전 허가 없이 복제, 배포, 수정하거나 다른 용도로 활용할 수 없습니다.

외부 라이브러리와 테마는 각 저작권자의 라이선스 조건을 따릅니다.

## 로컬 서버 실행 (Docker)

Ruby 로컬 환경 없이 Docker로 Jekyll 서버를 실행합니다.

### 준비
Docker Desktop이 실행 중이어야 합니다.

```bash
open -a Docker   # 최초 1회, 실행 중이 아닐 때만
```

### 서버 시작
```bash
docker compose up -d
```
최초 실행 시 `Gemfile.lock`에 맞는 gem을 받기 위해 아래 명령을 한 번 실행해야 합니다.

```bash
docker compose run --rm site bundle install
```

### 접속
http://localhost:4000/

### 로그 확인
```bash
docker compose logs -f
```

### 서버 중지 / 정리
```bash
docker compose stop   # 중지 (재시작: docker compose up -d)
docker compose down   # 컨테이너·네트워크 삭제 (gem 캐시는 유지)
```

### Gemfile 변경 시 재설치
```bash
docker compose run --rm site bundle install
```

