(function () {
  "use strict";
  var stages = [
    ["1. 비활성 포트에 새 버전 실행", "BLUE가 요청을 처리하는 동안 GREEN을 기동합니다.", "서비스 제공 중", "비활성 포트에서 기동", false],
    ["2. 내부 확인 3회 연속 성공", "GREEN의 내부 endpoint를 확인합니다. 아직 사용자 요청은 BLUE로 향합니다.", "서비스 제공 중", "internal health 3/3 성공", false],
    ["3. Apache proxy switch · reload 완료", "요청 경로가 GREEN으로 바뀝니다. 외부 확인 전이므로 기존 BLUE 프로세스도 남겨둡니다.", "프로세스 유지 · 복구 대비", "신규 요청 처리 · 외부 확인 전", true],
    ["4. 외부 확인 3회 연속 성공", "public endpoint를 확인한 뒤에만 active color를 GREEN으로 갱신합니다.", "프로세스 유지", "public health 3/3 · active 갱신", true],
    ["5. 연결 drain을 위해 30초 대기", "GREEN이 신규 요청을 처리합니다. 이전 연결이 정리될 시간을 두고 BLUE 종료를 기다립니다.", "30초 drain 대기", "서비스 제공 중", true],
    ["6. 이전 BLUE 프로세스 정리 완료", "이전 프로세스를 정리하며 정상 배포 흐름이 끝납니다.", "정리 완료", "서비스 제공 중", true],
    ["외부 확인 실패 → 복구 작업 성공 예시", "BLUE proxy 설정 복원과 reload가 성공한 경우입니다. GREEN을 정리하고 배포는 실패로 기록합니다.", "기존 서비스 제공", "실패 대상 정리", false]
  ];
  document.querySelectorAll("[data-deployx-blue-green]").forEach(function (figure) {
    if (figure.classList.contains("dx-ready")) return;
    function setText(selector, value) { figure.querySelector(selector).textContent = value; }
    function show(index) {
      var stage = stages[index];
      setText("[data-dx-caption-title]", stage[0]);
      setText("[data-dx-caption]", stage[1]);
      setText("[data-dx-blue-state]", stage[2]);
      setText("[data-dx-green-state]", stage[3]);
      setText("[data-dx-proxy]", stage[4] ? "신규 GREEN으로 요청 전달" : "기존 BLUE로 요청 전달");
      setText("[data-dx-route-blue]", stage[4] ? "신규 요청 없음" : "↓ 요청 전달");
      setText("[data-dx-route-green]", stage[4] ? "↓ 요청 전달" : "신규 요청 없음");
      ["[data-dx-blue]", "[data-dx-route-blue]"].forEach(function (selector) { figure.querySelector(selector).dataset.serving = String(!stage[4]); });
      ["[data-dx-green]", "[data-dx-route-green]"].forEach(function (selector) { figure.querySelector(selector).dataset.serving = String(stage[4]); });
      figure.querySelectorAll("[data-dx-step]").forEach(function (button) { button.setAttribute("aria-pressed", String(Number(button.dataset.dxStep) === index)); });
      figure.querySelector("[data-dx-recovery]").setAttribute("aria-pressed", String(index === 6));
    }
    figure.querySelectorAll("[data-dx-step]").forEach(function (button) { button.addEventListener("click", function () { show(Number(button.dataset.dxStep)); }); });
    figure.querySelector("[data-dx-recovery]").addEventListener("click", function () { show(6); });
    show(0);
    figure.classList.add("dx-ready");
  });
}());
