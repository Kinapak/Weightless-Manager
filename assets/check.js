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
				checkVersion(result.response.settings || false); // Сперва проверка на новую версию
				
				// Меню настроек
				if(result.response.settings){
					$.each(result.response.settings, function(link, name){
						$("#settings .tree").append("<li><a href='views/" + link + ".html'>" + name + "</a></li>");
					});
				} else $("#settings").remove();
				
				// Удаление прелоадера
				$(".preloader").fadeOut(300, function(){
					$(this).remove();
				});
			}
		},
		error: function(error){
			wmAlert("Ошибка подключения", "fail");
			console.log(error);
		}
	});
}

// Проверка обновлений приложения
function checkVersion(user){
	$.ajax({
		url: "https://russiabase.ru/wm/version.php",
		type: "GET",
		success: function(version){
			if(version == config.version) return false;
			
			let text, v = version;
			
			// Настройка текста
			if(user)
				text = "Новая версия Weightless Manager доступна к установке.<br><br><button id='app-update' class='btn btn-round btn-primary'>Установить</button>";
			else
				text = "Доступна новая версия Weightless Manager. Обратитесь к администратору приложения для установки обновления.";
			
			version = version.replace("v", "").split(".");
			let current_version = config.version.replace("v", "").split(".");
			
			// Определение критичности вышедшего обновления
			if(current_version[0] != version[0] || current_version[1] != version[1]){
				$("body")
					.html("<div class='update-screen'><p>" + text + "<br><br>" + v + "</p></div>")
					.css({
						"background": "linear-gradient(45deg, #89d8ca, #9face6)",
						"height": "100vh",
						"display": "flex",
						"align-items": "center",
						"justify-content": "center"
					});
			} else{
				$("#new-version-indicator-text").html(text);
				$("#new-version-indicator-version").html(v);
				$("#new-version-indicator").show();
			}
		}
	});
}