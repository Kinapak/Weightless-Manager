// Подключение общего конфига приложения
let config;
$.getJSON("/config.json", function(json){
	config = json;
});

// Функция проверки сохраненного токена на валидность
function checkToken(){
	let token = localStorage.getItem("token");
	
	// Если нет токена - переход на страницу логина
	if(token == undefined){
		location.href = "/login";
		return false;
	}
	
	$.ajax({
		url: config.api_login + "/check",
		type: "POST",
		dataType: "json",
		data: {
			"token": token
		},
		success: function(result){
			result = JSON.parse(result.response);
			
			if(!result.active){ // Если не валиден - удаляем токен и перенаправляем на страницу логина
				localStorage.removeItem("token");
				location.href = "/login";
			}
		}
	});
}