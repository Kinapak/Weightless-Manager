// Подключение общего конфига приложения и вызов проверки токена
let config;
$.getJSON("/config.json", function(json){
	config = json;
	
	checkToken(); // Проверка сразу после загрузки страницы
	setInterval(function(){
		checkToken();
	}, 600000);
});

// Функция проверки сохраненного токена на валидность
function checkToken(){
	let token = localStorage.getItem("user_token");
	
	// Если нет токена - переход на страницу логина
	if(token == undefined){
		location.href = "/login";
		return false;
	}
	
	$.ajax({
		url: config.api_user_login + "/check",
		type: "POST",
		dataType: "json",
		data: {
			"token": token
		},
		success: function(result){
			result = JSON.parse(result.response);
			
			if(!result.active){ // Если не валиден - удаляем токен и перенаправляем на страницу логина
				localStorage.removeItem("user_token");
				location.href = "/login";
			} else if($(".preloader").height()){ // Если токен валиден - удаляем прелоадер
				$(".preloader").fadeOut(300, function(){
					$(this).remove();
				});
			}
		}
	});
}