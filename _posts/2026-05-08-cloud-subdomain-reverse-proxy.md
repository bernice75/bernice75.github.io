---
layout: post
title: "클라우드 서버의 서비스들을 서브도메인으로 분리해보자"
description: "firewalld 포트 포워딩에 가려져 있던 Apache 리버스 프록시 문제를 진단하고, 서브도메인 기반 L7 라우팅 구조로 정리한 과정을 기록합니다."
date: 2026-05-08 15:00:00 +0900
header-img: assets/img/posts/2026-05-08-cloud-subdomain-reverse-proxy/cover.png
author: "김미림"

categories:
  - DevOps
  - Network
  - Apache
  - Infra
---

현재 KT Cloud 가상 서버 한 대에 여러 서비스를 함께 운영 중에 있습니다.<br>
메인 사이트는 설치형 Tomcat에 올라가 있고, 별도의 Spring Boot 서버로 ASP(매출 현황 확인)와 사내 ERP 서비스도 함께 떠 있습니다.<br>
초기에는 각 서비스를 서로 다른 포트 번호로 구분해 띄워두고 있었습니다.<br>
기능적으로는 문제가 없었지만, 사용자가 서비스에 접근할 때 포트 번호가 그대로 드러나는 구조가 마음에 걸렸습니다.<br>
외부에 노출되는 주소는 서비스 이름 중심으로 정리하고, 내부 포트 번호는 서버 안쪽 구현 세부사항으로 숨기고 싶었습니다.

처음에는 단순해 보였습니다.

1. Apache를 외부 진입점으로 둔다.
2. `ProxyPass`로 외부 URL과 내부 포트를 연결한다.
3. 사용자는 포트 번호를 모르고도 필요한 서비스로 이동한다.

하지만 실제로 설정을 적용해보니 의도한 대로 동작하지 않았습니다.<br>
`reverse-proxy.conf` 설정 파일을 만들어 라우팅 규칙을 작성했는데도, 어떤 경로로 접속하든 기대한 백엔드로 요청이 전달되지 않았습니다.<br>
결과적으로 이 문제는 단순한 Apache 설정 문제가 아니라, 기존 서버에 남아 있던 `firewalld` 포트 포워딩 규칙과 L4/L7 라우팅 책임이 섞여 생긴 문제였습니다.<br>
처음에는 포트 번호를 숨기기 위해 경로 기반 라우팅을 먼저 떠올렸지만, 운영 중인 애플리케이션의 경로 의존성을 고려하면 서브도메인 분리가 더 안정적인 선택이었습니다.

이번 글은 그 진단 과정과, 최종적으로 포트 기반 접근에서 서브도메인 기반 리버스 프록시 구조로 정리한 과정을 기록한 글입니다.

<br>

## 리버스 프록시를 직접 구축해본 것은 처음이었다

사실 리버스 프록시를 아예 처음 본 것은 아니었습니다.<br>
이전에도 운영 중인 서버에서 Nginx 리버스 프록시 설정을 수정해본 적은 있었습니다.<br>
다만 그때의 역할은 이미 다른 사람이 구축해둔 구조 위에서 새로운 `location` 규칙을 추가하고, 설정을 reload해서 반영하는 정도였습니다.

리버스 프록시를 "사용"해본 경험은 있었지만, Nginx와 Apache의 설정 방식 차이를 비교해가며 구조를 직접 잡아본 것은 아니었습니다.<br>
외부 트래픽이 실제로 어느 계층을 지나고, SSL은 어디에서 종료되며, 방화벽 포워딩과 Apache VirtualHost가 어떤 순서로 영향을 주는지까지 직접 설계하고 검증해본 경험도 부족했습니다.

그래서 이번 작업은 단순히 설정 파일 몇 줄을 추가하는 일이 아니었습니다.<br>
내가 작성한 규칙이 왜 적용되지 않는지, 요청이 Apache까지 도달하기는 하는지, 응답을 반환하는 주체가 Apache인지 Tomcat인지부터 하나씩 확인해야 했습니다.

이 과정에서 LLM 서비스의 도움을 많이 받았습니다.<br>
처음부터 정답을 물어본다기보다, 제가 확인한 명령어 결과와 가설을 던지고 "이 증거가 어떤 가능성을 줄이고, 다음에는 무엇을 확인해야 하는가"를 계속 검토하는 방식이었습니다.

예를 들면 이런 식이었습니다.

1. `httpd -S` 결과상 vhost는 등록되어 있는데 왜 `ProxyPass`가 먹지 않을까?
2. Spring Security 헤더가 보인다면 응답 주체를 어떻게 판단해야 할까?
3. Apache proxy access log가 0바이트라면 무엇을 의미할까?
4. `iptables`에는 규칙이 없는데도 포워딩이 될 수 있을까?

이 질문들을 혼자 순서대로 정리하기는 쉽지 않았습니다.<br>
LLM은 서버에 직접 접속해 문제를 대신 해결해준 것은 아니지만, 제가 가진 단서들을 정리하고 다음 확인 지점을 좁히는 데 꽤 유용했습니다.<br>
이번 글도 그 대화 과정에서 정리된 진단 흐름을 다시 제 언어로 묶은 기록에 가깝습니다.

<br>

## 기존 구조의 한계

기존 서버는 하나의 KT Cloud 가상 서버 위에 여러 Java 애플리케이션이 함께 동작하는 구조였습니다.

#### **운영 중인 서비스**

1. 설치형 Tomcat: 메인 사이트
2. Spring Boot 매출 ASP 서버
3. Spring Boot 사내 ERP 서버
4. Apache HTTPD: 외부 요청 진입점으로 사용할 예정

포트 번호를 숨기기 위한 첫 접근은 하나의 도메인 아래에서 경로로 서비스를 나누는 방식이었습니다.<br>
예를 들어 외부 사용자는 내부 포트 번호 대신 다음 URL로 접근하게 만드는 구상이었습니다.

| URL | 라우팅 대상 |
|---|---|
| `https://domain.com/` | 메인 사이트 |
| `https://domain.com/admin/` | ERP 서버 |
| `https://domain.com/asp/` | ASP 서버 |

경로 기반 라우팅은 언뜻 보면 가장 쉬운 선택처럼 보입니다.<br>
도메인은 하나만 쓰고, Apache에서 path prefix만 보고 백엔드로 넘기면 되기 때문입니다.

하지만 운영 환경에서는 생각보다 많은 부분이 맞물립니다.

1. 프론트엔드 정적 리소스가 절대 경로를 기준으로 작성되어 있는가?
2. Spring Boot 애플리케이션이 `X-Forwarded-Prefix`를 인식하는가?
3. WAS의 context path와 Apache의 `ProxyPass` prefix가 일치하는가?
4. `/asp`와 `/asp/`처럼 슬래시 유무에 따른 리다이렉트가 정리되어 있는가?

특히 이미 운영 중인 서비스라면 애플리케이션 내부 경로를 전부 바꾸기 어렵습니다.<br>
그래서 장기적으로는 경로 기반 라우팅보다 `asp.domain.com`, `admin.domain.com`처럼 서브도메인으로 분리하는 편이 더 명확하다고 판단했습니다.

서브도메인 방식은 URL 경로를 애플리케이션 내부 구조에 억지로 끼워 맞추지 않아도 됩니다.<br>
서비스별로 독립된 루트 경로를 유지할 수 있고, Apache는 Host 헤더를 기준으로 어느 백엔드에 보낼지만 결정하면 됩니다.

<br>

## L4 포워딩과 L7 프록시가 섞여 있었다

이번 작업에서 가장 중요했던 구분은 L4 포워딩과 L7 리버스 프록시였습니다.

L4 포워딩은 포트 중심으로 동작합니다.<br>
예를 들어 `80` 포트로 들어온 트래픽을 `8080` 포트로 넘기는 식입니다.<br>
이 계층에서는 `admin.domain.com`인지, `asp.domain.com`인지 같은 도메인 이름을 기준으로 판단할 수 없습니다.

반면 Apache 리버스 프록시는 HTTP 요청을 해석할 수 있습니다.<br>
Host 헤더, path, scheme 같은 정보를 보고 요청을 백엔드로 분기할 수 있습니다.<br>
즉 서브도메인 기반 라우팅을 하려면 최종 판단 지점이 Apache 같은 L7 계층에 있어야 합니다.

문제는 이전 운영 방식에서 사용하던 firewalld 포트 포워딩 규칙이 그대로 남아 있었다는 점입니다.

```bash
forward-ports: port=80:proto=tcp:toport=8080:toaddr=
               port=443:proto=tcp:toport=8443:toaddr=
```

이 규칙은 외부에서 들어온 `80`, `443` 트래픽을 Apache가 HTTP 요청으로 분석하기 전에 각각 Tomcat의 `8080`, `8443`으로 직접 넘기고 있었습니다.<br>
Apache가 정상적으로 떠 있어도, 실제 외부 요청은 Apache의 리버스 프록시 설정을 거의 지나지 않는 구조였던 것입니다.

이 상태에서 `reverse-proxy.conf`를 아무리 고쳐도 결과가 바뀌기 어려웠습니다.<br>
라우팅 규칙이 틀린 것이 아니라, 라우팅 규칙을 실행할 기회 자체가 없었기 때문입니다.

<br>

## 처음에는 Apache 설정 문제처럼 보였다

처음 확인한 것은 Apache의 VirtualHost 등록 상태였습니다.

```bash
sudo httpd -S
```

결과상으로는 `reverse-proxy.conf`에 정의한 vhost가 `*:443`의 기본 서버로 정상 등록되어 있었습니다.

```text
*:443                  is a NameVirtualHost
         default server domain.com (/etc/httpd/conf.d/reverse-proxy.conf:1)
         port 443 namevhost domain.com (/etc/httpd/conf.d/reverse-proxy.conf:1)
```

이 출력만 보면 Apache가 요청을 받을 준비는 된 것처럼 보입니다.<br>
그래서 처음에는 `ProxyPass` 순서, path prefix, SSL 설정 같은 Apache 내부 설정을 의심했습니다.

그런데 이상한 점이 있었습니다.<br>
`https://domain.com/`으로 접속하면 메인 Tomcat 페이지가 표시되는데, 정작 `reverse-proxy.conf`에는 `/` 경로를 Tomcat으로 보내는 `ProxyPass` 규칙이 없었습니다.

규칙이 없는데도 Tomcat 응답이 나오고 있었습니다.<br>
이때부터 "Apache가 라우팅하고 있다"는 전제를 의심해야 했습니다.

<br>

## 응답 헤더는 Spring을 가리키고 있었다

다음으로 응답 헤더를 확인했습니다.

```bash
curl -I https://domain.com/
```

응답에는 다음과 같은 헤더들이 포함되어 있었습니다.

```text
Cache-Control: private
Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000 ; includeSubDomains
X-Frame-Options: SAMEORIGIN
Content-Language: en-US
```

이 조합은 Apache가 단순 정적 파일을 반환할 때의 모습이라기보다, Spring Security가 붙은 애플리케이션 응답에 가까웠습니다.<br>
즉 응답 주체는 Apache가 아니라 Spring 애플리케이션일 가능성이 높았습니다.

다만 이것만으로는 아직 부족했습니다.<br>
Apache가 Spring으로 프록시한 결과일 수도 있기 때문입니다.<br>
그래서 Apache vhost가 실제로 요청을 받은 흔적이 있는지 확인해야 했습니다.

<br>

## 전환점은 0바이트 로그였다

`reverse-proxy.conf`에는 별도의 access log와 error log를 남기도록 설정해두었습니다.

```apache
ErrorLog /var/log/httpd/proxy_error.log
CustomLog /var/log/httpd/proxy_access.log combined
```

이 파일들을 확인했을 때 결정적인 단서가 나왔습니다.

```text
-rw-r--r-- 1 root root 0 May  6 17:32 /var/log/httpd/proxy_access.log
-rw-r--r-- 1 root root 0 May  6 17:32 /var/log/httpd/proxy_error.log
```

두 파일이 모두 0바이트였습니다.

이 지점이 진단의 방향을 바꾼 순간이었습니다.<br>
Apache의 `CustomLog`는 `ProxyPass` 매칭에 성공했을 때만 남는 로그가 아닙니다.<br>
해당 vhost로 요청이 들어오기만 하면, 라우팅 성공 여부와 관계없이 access log가 남아야 합니다.

그런데 로그가 비어 있다는 것은 `reverse-proxy.conf`의 vhost가 외부 요청을 처리한 적이 없다는 뜻입니다.<br>
즉 문제는 Apache 내부 라우팅 규칙이 아니라, 요청이 Apache까지 도달하지 못하는 경로에 있었습니다.

이 판단도 처음부터 바로 떠올린 것은 아니었습니다.<br>
저는 계속 Apache 설정 안에서 원인을 찾으려 했고, `ProxyPass` 순서나 SSL 설정을 의심했습니다.<br>
그런데 LLM과 함께 로그의 의미를 다시 따져보면서, "로그가 비어 있다면 라우팅 실패가 아니라 요청 미도달일 수 있다"는 방향으로 가설을 바꿀 수 있었습니다.

<br>

## 동일한 인증서가 진단을 헷갈리게 했다

중간에 한 번 더 헷갈렸던 부분은 SSL 인증서였습니다.<br>
Apache와 Tomcat 8443 Connector가 같은 Let's Encrypt 인증서를 사용하고 있었습니다.

Tomcat의 `server.xml`에는 다음과 같은 SSL Connector 설정이 있었습니다.

```xml
<Connector port="8443" SSLEnabled="true" ...>
    <SSLHostConfig>
        <Certificate certificateFile="/etc/letsencrypt/live/domain.com/cert.pem"
                     certificateKeyFile="/etc/letsencrypt/live/domain.com/privkey.pem"
                     certificateChainFile="/etc/letsencrypt/live/domain.com/chain.pem"
                     type="RSA" />
    </SSLHostConfig>
</Connector>
```

이 상태에서는 `curl -v`로 인증서 정보를 봐도 Apache가 응답한 것인지 Tomcat이 직접 응답한 것인지 구분하기 어렵습니다.<br>
둘 다 같은 인증서를 사용하기 때문입니다.

결국 인증서 정보보다 더 신뢰할 수 있었던 단서는 Apache의 vhost access log였습니다.<br>
로그가 비어 있다는 사실은 인증서 정보보다 훨씬 직접적인 증거였습니다.

<br>

## 원인은 firewalld forward-port였다

포트 청취 상태를 확인했을 때는 Apache와 Tomcat이 모두 떠 있었습니다.

| 포트 | 프로세스 | 의미 |
|---|---|---|
| 80, 443 | httpd | Apache |
| 8080 | java | Tomcat HTTP Connector |
| 8443 | java | Tomcat SSL Connector |
| 28080 | java | ASP 서버 |

`ss -tlnp`만 보면 Apache가 `443`을 듣고 있으니 정상처럼 보입니다.<br>
하지만 실제 외부 트래픽 경로는 방화벽 NAT 규칙을 함께 봐야 합니다.

처음에는 `iptables -t nat -L PREROUTING`을 확인했지만 표준 체인에는 눈에 띄는 규칙이 없었습니다.<br>
CentOS 7 환경에서는 firewalld가 자체 체인을 사용하기 때문에 이것만으로는 충분하지 않았습니다.

여기까지 오는 동안 꽤 많은 시간을 Apache 설정 안에서만 소비했습니다.<br>
`VirtualHost`가 잘못 잡힌 것인지, SSL 설정이 부족한 것인지, `ProxyPass` 순서가 문제인지 계속 확인했지만 결정적인 답은 나오지 않았습니다.<br>
솔직히 말하면 이때부터는 같은 가설을 반복 검토하며 시간을 쓰고 있다는 느낌도 있었습니다.

그때 기존 작업자가 남겨둔 SSL 인증서 갱신 스크립트가 생각났습니다.<br>
스크립트 내용을 열어보니 인증서를 갱신하기 전에 잠시 firewalld의 포워딩 규칙을 해제하고, 갱신이 끝난 뒤 `reload`로 규칙을 다시 복구하는 흐름이 있었습니다.

처음에는 그 스크립트가 이번 reverse proxy 문제와 직접 관련이 있을 거라고 확신하지는 못했습니다.<br>
다만 "인증서 갱신 때 왜 방화벽 포워딩을 건드렸을까?", "이 규칙이 평소 트래픽 경로에도 영향을 주고 있는 것은 아닐까?"라는 의문이 생겼습니다.<br>
그래서 이 단서를 LLM에 다시 던졌고, 그때부터 `firewall-cmd --list-all`로 firewalld가 관리하는 forward-port 규칙을 직접 확인해야 한다는 방향으로 진단이 좁혀졌습니다.

결국 다음 명령으로 원인이 확인됐습니다.

```bash
sudo firewall-cmd --list-all
```

결과에는 기존 포워딩 규칙이 남아 있었습니다.

```text
forward-ports: port=80:proto=tcp:toport=8080:toaddr=
               port=443:proto=tcp:toport=8443:toaddr=
```

실제 트래픽 흐름은 다음과 같았습니다.

```text
[클라이언트] :443
    |
    | firewalld forward-port: 443 -> 8443
    v
[Tomcat :8443]
    |
    | Tomcat이 SSL 직접 처리
    v
[메인 Spring Boot 앱]

[Apache :443]
    |
    | 정상 기동 중이지만 외부 요청을 받지 못함
    v
[reverse-proxy.conf의 ProxyPass 규칙은 실행되지 않음]
```

Apache는 떠 있었습니다.<br>
설정 파일도 로드되어 있었습니다.<br>
하지만 외부 요청은 방화벽 단계에서 Tomcat으로 먼저 보내지고 있었습니다.

<br>

## 먼저 방화벽 포워딩을 제거했다

해결은 Apache가 요청을 받을 수 있도록 제어권을 되돌리는 것부터 시작했습니다.<br>
바로 영구 설정을 바꾸기 전에, 먼저 런타임 설정에서만 제거하고 동작을 확인하는 방식으로 진행했습니다.

```bash
sudo firewall-cmd --remove-forward-port=port=443:proto=tcp:toport=8443:toaddr=
sudo firewall-cmd --remove-forward-port=port=80:proto=tcp:toport=8080:toaddr=
```

그 다음 요청을 다시 보내고 Apache 로그가 증가하는지 확인했습니다.

```bash
curl -vkI https://domain.com/
sudo tail -20 /var/log/httpd/proxy_access.log
```

Apache vhost 로그에 요청이 찍히기 시작하면, 이제야 `reverse-proxy.conf`의 라우팅 규칙을 검증할 수 있는 상태가 됩니다.<br>
검증 후에는 영구 설정에서도 같은 포워딩 규칙을 제거했습니다.

```bash
sudo firewall-cmd --permanent --remove-forward-port=port=443:proto=tcp:toport=8443:toaddr=
sudo firewall-cmd --permanent --remove-forward-port=port=80:proto=tcp:toport=8080:toaddr=
sudo firewall-cmd --reload
```

이후부터는 외부 트래픽이 Apache로 들어오고, Apache가 L7 계층에서 서비스별 라우팅을 담당하는 구조로 바뀌었습니다.

<br>

## 서브도메인 기반으로 구조를 정리했다

방화벽 포워딩 문제를 제거한 뒤에는 경로 기반 라우팅보다 서브도메인 기반 구조로 정리하는 방향을 선택했습니다.

예상 구조는 다음과 같습니다.

| 서브도메인 | 대상 서비스 |
|---|---|
| `domain.com` | 메인 사이트 |
| `admin.domain.com` | ERP 서비스 |
| `asp.domain.com` | ASP 서비스 |

이 구조에서는 각 서비스가 자기 자신을 `/` 기준으로 동작한다고 생각할 수 있습니다.<br>
Apache는 Host 헤더를 보고 백엔드 포트만 분기합니다.

개념적으로는 다음과 같은 형태입니다.

```apache
<VirtualHost *:443>
    ServerName admin.domain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/domain.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:18080/
    ProxyPassReverse / http://127.0.0.1:18080/
</VirtualHost>

<VirtualHost *:443>
    ServerName asp.domain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/domain.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:28080/
    ProxyPassReverse / http://127.0.0.1:28080/
</VirtualHost>
```

실제 설정에서는 각 서비스의 포트, health check 경로, 로그 파일, timeout 값을 운영 환경에 맞게 조정해야 합니다.<br>
중요한 것은 더 이상 외부 사용자가 내부 WAS 포트로 직접 들어오지 않고, Apache가 모든 HTTPS 진입점을 담당한다는 점입니다.

<br>

## SSL 종료 지점도 Apache로 모았다

이번 정리의 또 다른 목적은 SSL 관리 지점을 줄이는 것이었습니다.

기존에는 Tomcat 8443 Connector가 직접 SSL을 처리하고 있었고, Apache도 SSL 설정을 가질 수 있는 상태였습니다.<br>
이렇게 되면 인증서 갱신, 적용 위치, 장애 진단 지점이 분산됩니다.

서브도메인 기반 리버스 프록시 구조에서는 Apache가 SSL termination을 담당하게 하고, 단일 서버 내부 통신이라는 전제에서는 Apache와 백엔드 애플리케이션 사이의 통신을 HTTP로 단순화할 수 있습니다.

이렇게 하면 역할이 분리됩니다.

| 계층 | 역할 |
|---|---|
| Apache | HTTPS 종료, Host 기반 라우팅, 공통 보안 헤더, access log |
| Spring Boot / Tomcat | 비즈니스 로직 처리 |
| firewalld | 외부 공개 포트 제한, 불필요한 포워딩 제거 |

물론 내부 통신까지 반드시 암호화해야 하는 환경이라면 백엔드 HTTPS를 유지할 수도 있습니다.<br>
하지만 단일 서버 내부의 로컬 통신이라면, 우선은 Apache에 SSL 책임을 모으는 편이 운영 복잡도를 줄이는 데 유리했습니다.

<br>

## DNS와 인증서도 함께 정리했다

서브도메인 방식으로 바꾸려면 DNS도 함께 정리해야 합니다.<br>
`admin.domain.com`, `asp.domain.com`이 같은 KT Cloud 서버로 도달하도록 A 레코드를 추가했습니다.

그 다음 Let's Encrypt 인증서에 서브도메인을 포함시켜야 했습니다.<br>
운영 중인 서버를 멈추지 않기 위해 Webroot 방식으로 인증서를 확장하는 방식을 사용했습니다.

핵심은 인증서도 라우팅 구조와 같은 기준으로 관리하는 것입니다.

1. DNS는 모든 서브도메인이 Apache 서버로 향하게 한다.
2. Apache는 각 `ServerName`별 VirtualHost를 가진다.
3. Let's Encrypt 인증서는 해당 서브도메인을 모두 포함한다.
4. 백엔드 WAS는 외부 도메인과 인증서 관리에서 분리한다.

이렇게 정리하면 새 서비스를 추가할 때도 흐름이 단순해집니다.<br>
DNS 레코드 추가, 인증서 확장, Apache vhost 추가, 백엔드 포트 연결 순서로 작업하면 됩니다.

<br>

## 적용 후 확인한 것

설정을 반영한 뒤에는 먼저 Apache 로그부터 확인했습니다.<br>
이전에는 `proxy_access.log`가 0바이트였지만, firewalld 포워딩을 제거한 뒤에는 각 서브도메인 요청이 Apache vhost 로그에 기록되기 시작했습니다.<br>
이 로그가 찍힌다는 것은 외부 요청이 더 이상 Tomcat 8443으로 직접 들어가지 않고, Apache의 VirtualHost와 `ProxyPass` 처리를 지나고 있다는 의미였습니다.

그 다음 브라우저에서 각 URL이 기대한 서비스로 연결되는지 확인했습니다.

| 확인 URL | 기대한 결과 | 확인 결과 |
|---|---|---|
| `https://domain.com/` | 메인 사이트 | 메인 사이트 정상 응답 |
| `https://admin.domain.com/` | ERP 서비스 | ERP 서비스 정상 응답 |
| `https://asp.domain.com/` | 매출 ASP 서비스 | 매출 ASP 서비스 정상 응답 |

결과적으로 사용자는 더 이상 내부 포트 번호를 알 필요가 없어졌고, 서비스별 주소도 역할에 맞게 분리되었습니다.<br>
또한 장애를 확인할 때도 각 요청이 Apache access log에 남기 때문에, 이전보다 트래픽 흐름을 추적하기 쉬워졌습니다.

<br>

## 작업 후 얻은 이점

이번 작업 전후의 차이를 정리하면 다음과 같습니다.

| 구분 | 이전 구성 | 개선 구성 |
|---|---|---|
| 트래픽 분기 | 포트 번호 중심 | 서브도메인 Host 기준 |
| 계층 | firewalld L4 포워딩 | Apache L7 리버스 프록시 |
| SSL 관리 | WAS별 개별 처리 가능성 | Apache에서 통합 처리 |
| 보안 | 내부 포트 직접 노출 위험 | 외부 진입점 Apache로 제한 |
| 확장성 | 방화벽 포워딩 수정 필요 | VirtualHost 추가로 확장 |
| 진단 | 응답 주체 파악이 어려움 | Apache access log 기준으로 추적 가능 |

가장 큰 변화는 관심사의 분리였습니다.<br>
방화벽은 외부에 열 포트를 제한하고, Apache는 HTTP 요청을 해석해 라우팅하며, 백엔드 애플리케이션은 비즈니스 로직만 처리합니다.

처음에는 단순히 "서브도메인을 붙인다"는 작업처럼 보였지만, 실제로는 트래픽 제어 책임을 L4에서 L7로 옮기는 작업에 가까웠습니다.

<br>

## 이번 작업에서 배운 점

첫 번째로, `httpd -S`에서 vhost가 정상 등록되어 있다고 해서 실제 트래픽이 그 vhost에 도달한다고 단정하면 안 됩니다.<br>
Apache 내부 설정을 보기 전에, 요청이 어느 계층을 거쳐 어디로 흐르는지 확인해야 합니다.

두 번째로, access log는 매우 강한 단서입니다.<br>
특히 vhost별 로그를 따로 두면 "Apache가 받았지만 라우팅에 실패한 것인지", "아예 Apache까지 오지 않은 것인지"를 빠르게 나눌 수 있습니다.<br>
이번 작업에서 0바이트 로그는 모든 가설을 바꾸게 만든 결정적인 증거였습니다.

세 번째로, CentOS 7 이상 환경에서는 `iptables`만 보지 말고 `firewall-cmd`도 함께 확인해야 합니다.<br>
firewalld가 자체 체인에서 포워딩을 처리하고 있으면 표준 PREROUTING 체인만 보고는 놓칠 수 있습니다.

```bash
sudo iptables -t nat -L -n -v
sudo firewall-cmd --list-all
sudo firewall-cmd --direct --get-all-rules
```

마지막으로, 같은 인증서를 여러 계층에서 사용하면 진단이 어려워질 수 있습니다.<br>
인증서 정보만으로는 응답 주체를 구분하기 어렵기 때문에, 포트 청취 상태와 로그를 함께 봐야 합니다.

<br>

## 마무리

이번 작업의 핵심은 Apache 설정을 더 많이 추가하는 것이 아니었습니다.<br>
오히려 기존에 남아 있던 firewalld 포트 포워딩을 제거하고, 트래픽이 Apache까지 도달하도록 책임 경계를 다시 잡는 일이었습니다.

서브도메인 기반 리버스 프록시로 정리하면서 서비스별 URL은 더 명확해졌고, SSL과 access log도 Apache 계층에서 일관되게 관리할 수 있게 됐습니다.<br>
백엔드 애플리케이션은 더 이상 외부 포트와 인증서 처리까지 신경 쓰지 않고, 자기 역할에 집중할 수 있는 구조가 되었습니다.

한 줄로 정리하면 다음과 같습니다.

> reverse proxy가 동작하지 않는 것처럼 보였지만, 실제 원인은 Apache 설정이 아니라 Apache 앞단의 firewalld forward-port였다. 서브도메인 기반 구조로 바꾸려면 요청의 최종 판단 지점을 반드시 L7 프록시 계층으로 가져와야 한다.
