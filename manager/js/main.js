setTimeout(function(){
	// Проверка кода из IBM
	if(params["code"]){
		$.ajax({
			url: config.api_user_login + "/token",
			type: "POST",
			dataType: "json",
			data: {
				"code": params["code"],
				"app_id": config.app_id,
				"secret": config.secret,
				"path": location.pathname
			},
			success: function(result){
				// Если пришли токены, то запоминаем их
				if(result.response.user_token){
					localStorage.setItem("user_token", result.response.user_token);
					localStorage.setItem("IAM_token", result.response.iam_token);
					localStorage.setItem("user_info", JSON.stringify(result.response.user_info));
					location.href = config.domain;
				} else{ // Иначе вывод ошибки и редирект на главную сайта
					wmAlert("Ошибка авторизации!", "fail");
					setTimeout(function(){
						location.href = "/";
					}, 4000);
				}
			}
		});
	}
	
	// Информация о пользователе
	let user_info = JSON.parse(localStorage.getItem("user_info"));
	
	// Установка имени пользователя и ссылки для изменения пароля
	$(".user-name span").text(user_info.name);
	$(".user-name ul").append(
		`<li><a href='https://eu-gb.appid.cloud.ibm.com/oauth/v4/${config.tenant}/authorization?response_type=change_password&client_id=${config.app_id}&redirect_uri=${encodeURI(config.domain)}&scope=openid&user_id=${encodeURI(user_info.identities[0].id)}'><i class="fa fa-lock"></i> Изменить пароль</a></li>`
	);
	
	dbList();
	
	// Загрузка главной страницы
	loadView("views/index.html", "Главная");
}, 500);

// Загрузка списка баз данных в меню
function dbList(){
	let $databases = $("#databases");
	
	$.ajax({
		url: config.api_db_management + "/list",
		type: "POST",
		dataType: "json",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"user-token": localStorage.getItem("user_token"),
			"iam-token": localStorage.getItem("IAM_token")
		},
		success: function(result){
			$databases.html("");
			
			if(!result.databases) return false;
			
			$.each(result.databases, function(id, val){
				$databases.append("<li><a href='views/database.html'>" + id + "</a></li>");
			});
			
			if($databases.parent().children(".tree").css("display") == "none")
				$databases.parent().children(".tree-toggle").trigger("click");
		},
		error: function(result){
			// Если ошибка, то вывод ошибки и логов
			console.log(result);
			
			$databases.html("");
			$databases.append("<li><a href='#'>ОШИБКА! См. логи</a></li>");
		}
	});
}

// Вывод сообщения с автоматическим скрытием на страницу
function wmAlert(message, type){
	let icon = "bell", duration = 500, timeout = 3000; // Иконка, скорость анимации и таймаут
	
	$("#wm-alert").attr("class", "").addClass(type); // Сброс классов и установка класса по типу
	
	// Добавление иконки
	if(type == "success") icon = "check-circle";
	if(type == "fail") icon = "close";
	$("#wm-alert .fa").addClass("fa-" + icon);
	
	$("#wm-alert p").text(message);
	
	// Отображение
	$("#wm-alert").css("display", "block").animate({
		right: 10
	}, duration);
	
	// Скрытие через указанное время
	setTimeout(function(){
		$("#wm-alert").animate({
			right: -300
		}, duration, "swing", function(){
			$("#wm-alert").css("display", "none");
		});
	}, timeout);
}

// Подгрузка страниц и заголовка вкладки
function loadView(href, title){
	/* Дополнительная проверка токена перед подгрузкой страниц
	* Особенно важно, когда на странице совершаются действия, для которых нужен валидный токен */
	checkToken();
	
	// Подгрузка страницы. Если нет страницы, вывод 404
	$("#main-view").load("manager/" + href, function(response, status, xhr){
		if(status == "error"){
			$("#main-view").load("manager/views/404.html");
			wmAlert("Элемент не найден", "fail");
		}
	});
	
	$("title").text("Weightless Manager | " + title);
}

// Подгрузка страницы по клику в дереве
$(document).on("click", ".tree a", function(e){
	e.preventDefault();
	
	loadView($(this).attr("href"), $(this).text());
	
	$(".ripple a").removeClass("active");
	$(this).closest(".ripple").children("a").addClass("active");
	$(".tree li").removeClass("active");
	$(this).parent().addClass("active");
});

// Подгрузка страницы без дерева
$(document).on("click", ".ripple a:eq(0)", function(e){
	e.preventDefault();
	
	if($(this).parent().find(".tree").length) return false;
	
	loadView($(this).attr("href"), $(this).text());
	
	$(".ripple a").removeClass("active");
	$(this).closest(".ripple").children("a").addClass("active");
	$(".tree li").removeClass("active");
});

// Обработка кнопки выхода
$(document).on("click", "#logout", function(){
	// Удаление текущей сессии
	localStorage.removeItem("user_token");
	localStorage.removeItem("IAM_token");
	localStorage.removeItem("user_info");
	
	// Переход на главную сайта
	location.href = "/";
});