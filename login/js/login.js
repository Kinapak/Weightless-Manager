(function($){
	
	// Подключение общего конфига приложения
	let config;
	$.getJSON("/config.json", function(json){
		config = json;
	});
	
	// Запрос токена по введенным учетным данным
	$("#login-form").on("submit", function(e){
		e.preventDefault();
		
		$.ajax({
			url: config.api_login + "/token",
			type: "POST",
			dataType: "json",
			data: {
				"username": btoa($("[name='email']").val()),
				"password": btoa($("[name='pass']").val())
			},
			success: function(result){
				result = JSON.parse(result.response);
				
				// Если пришел токен, установка куки с ним в миллисекундах
				if(result.access_token){
					setCookie(
						"token",
						result.access_token,
						{"expires": new Date(new Date().getTime() + result.expires_in * 1000)}
					);
					//todo переход в панель
				}
			}
		});
	});
	
})(jQuery);