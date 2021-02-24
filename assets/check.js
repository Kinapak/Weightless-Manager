// Получение GET-параметров
let params = window
	.location
	.search
	.replace('?', '')
	.split('&')
	.reduce(
		function(p, e){
			var a = e.split('=');
			p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
			return p;
		},
		{}
	);

// Подключение общего конфига приложения и вызов проверки токена
let config;
$.getJSON("config.json", function(json){
	config = json;
	
	checkToken(); // Проверка сразу после загрузки страницы
	setInterval(function(){
		checkToken();
	}, 600000);
});

// Функция проверки сохраненного токена на валидность
function checkToken(){
	if(params["code"]) return false;
	
	let token = localStorage.getItem("user_token");
	
	// Если нет токена - удаление остальных данных и переход на страницу логина
	if(token == undefined){
		localStorage.removeItem("IAM_token");
		localStorage.removeItem("user_info");
		location.href = `https://eu-gb.appid.cloud.ibm.com/oauth/v4/${config.tenant}/authorization?response_type=code&client_id=${config.app_id}&redirect_uri=${encodeURI(config.domain)}&scope=openid&language=ru-RU`;
		return false;
	}
	
	$.ajax({
		url: config.api_user_login + "/check",
		type: "POST",
		dataType: "json",
		data: {
			"user-token": token,
			"iam-token": localStorage.getItem("IAM_token"),
			"app_id": config.app_id,
			"secret": config.secret
		},
		success: function(result){
			if(!result.response.active){ // Если не валиден - удаляем токены и перенаправляем на страницу логина
				localStorage.removeItem("user_token");
				localStorage.removeItem("IAM_token");
				localStorage.removeItem("user_info");
				location.href = `https://eu-gb.appid.cloud.ibm.com/oauth/v4/${config.tenant}/authorization?response_type=code&client_id=${config.app_id}&redirect_uri=${encodeURI(config.domain)}&scope=openid&language=ru-RU`;
			} else if($(".preloader").height()){ // Если токен валиден - удаляем прелоадер и загружаем настройки
				if(result.response.settings){
					$.each(result.response.settings, function(link, name){
						$("#settings .tree").append("<li><a href='views/" + link + ".html'>" + name + "</a></li>");
					});
				} else $("#settings").remove();
				
				$(".preloader").fadeOut(300, function(){
					$(this).remove();
				});
			}
		}
	});
}