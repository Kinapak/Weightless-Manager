(function($){
	
	// Подключение общего конфига приложения
	let config;
	$.getJSON("/config.json", function(json){
		config = json;
	});
	
	// Запрос токенов по введенным учетным данным
	$("#login-form").on("submit", function(e){
		e.preventDefault();
		
		$(this).find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-2x'></i>").attr("type", "button");
		
		$.ajax({
			url: config.api_user_login + "/token",
			type: "POST",
			dataType: "json",
			data: {
				"username": btoa($("[name='email']").val()),
				"password": btoa($("[name='pass']").val())
			},
			success: function(result){
				let user = $.parseJSON(result.response.user_token);
				let IAM = $.parseJSON(result.response.iam_token);
				
				// Если пришли токены, то запоминаем их
				if(user.access_token && IAM.access_token){
					localStorage.setItem("user_token", user.access_token);
					localStorage.setItem("IAM_token", IAM.access_token);
					location.href = "/";
				}
			}
		});
	});
	
})(jQuery);