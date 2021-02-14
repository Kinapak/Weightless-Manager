(function($){
	
	// Подключение общего конфига приложения
	let config;
	$.getJSON("/config.json", function(json){
		config = json;
	});
	
	// Запрос токенов по введенным учетным данным
	$("#login-form").on("submit", function(e){
		e.preventDefault();
		
		// Экземпляр кнопки входа
		let $btn = $(this).find("[type='submit']");
		$btn.html("<i class='fa fa-spinner fa-pulse fa-2x'></i>").attr("type", "button");
		
		// Удаление сообщения об ошибке, если есть
		$(".login100-form-btn").parent().find("p").remove();
		
		$.ajax({
			url: config.api_user_login + "/token",
			type: "POST",
			dataType: "json",
			data: {
				"username": btoa($("[name='email']").val()),
				"password": btoa($("[name='pass']").val())
			},
			success: function(result){
				// Если пришли токены, то запоминаем их и перенаправляем в приложение
				if(result.response.user_token && result.response.iam_token){
					localStorage.setItem("user_token", result.response.user_token);
					localStorage.setItem("IAM_token", result.response.iam_token);
					localStorage.setItem("user_info", JSON.stringify(result.response.user_info));
					location.href = "/";
				} else{ // Вывод ошибки и выделение полей
					$("input").addClass("error-field").parent().addClass('alert-validate');
					$(".login100-form-btn").parent().prepend("<p>Некорректно указан логин или пароль</p>");
					$btn.html("Войти").attr("type", "submit");
				}
			}
		});
	});
	
	// Удаление сообщений об ошибке
	$("input").focusin(function(){
		$(".wrap-input100").removeClass("alert-validate");
		$("input").removeClass("error-field");
		$(".login100-form-btn").parent().find("p").remove();
	});
	
})(jQuery);