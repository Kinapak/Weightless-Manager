// Подключение общего конфига приложения
let config;
$.getJSON("/config.json", function(json){
	config = json;
});

// Функция проверки сохраненного токена на валидность
function checkToken(){
	let token = getCookie("token");
	
	// Если нет куки с токеном - переход на страницу логина
	if(token == undefined){
		location.href = "/login";
		return false;
	}
	
	$.ajax({
		url: config.api_login + "/check",
		type: "POST",
		dataType: "json",
		data: {
			"clientId": config.clientId,
			"secret": config.secret,
			"token": token
		},
		success: function(result){
			result = JSON.parse(result.response);
			
			if(!result.active) location.href = "/login"; // Если не валиден - перенаправление на страницу логина
		}
	});
}