$(document).ready(function(){
	
	// Обработка формы на добавление новой базы данных
	$("#add-database").on("submit", function(e){
		e.preventDefault();
		
		checkToken(); // Проверка авторизации
		
		let form = $(this), public_key;
		let encryption = new JSEncrypt();
		
		// Иконка лоадера. Также смена типа кнопки, чтобы данные не отправлялись вдогонку
		$(this).find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
		
		// Получение и инициализация публичного ключа
		$.ajax({
			url: config.api_db_management + "/publicKey",
			type: "GET",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			success: function(result){
				public_key = result.public_key;
				
				// Проверка публичного ключа. Если его нет, выход
				if(public_key.length > 1) encryption.setPublicKey(public_key);
				else return false;
				
				// Обработка селекта
				if(!form.find("[name='type']").val()){
					form.find("[name='type']").addClass("danger");
					return false;
				} else form.find("[name='type']").removeClass("danger");
				
				// Запрос на добавление базы данных
				$.ajax({
					url: config.api_db_management + "/add",
					type: "POST",
					dataType: "json",
					headers: {
						"Authorization": "Bearer " + localStorage.getItem("user_token")
					},
					data: {
						"name": $("[name='name']").val(),
						"ip": $("[name='ip']").val(),
						"port": $("[name='port']").val(),
						"user": encryption.encrypt($("[name='user']").val()),
						"password": encryption.encrypt($("[name='password']").val()),
						"db": encryption.encrypt($("[name='db']").val()),
						"type": $("[name='type']").val(),
						"user-token": localStorage.getItem("user_token"),
						"iam-token": localStorage.getItem("IAM_token")
					},
					success: function(result){
						// Сброс формы и кнопки
						form.trigger("reset");
						form.find("[type='button']").html("Добавить").attr("type", "submit");
						
						wmAlert("База данных успешно добавлена", "success");
						dbList();
					},
					error: function(result){
						// Если ошибка, то сброс кнопки и вывод логов
						form.find("[type='button']").html("Добавить").attr("type", "submit");
						wmAlert("Ошибка! См. логи. ", "fail");
						console.log(result);
					}
				});
			},
			error: function(result){
				// Если ошибка, то сброс кнопки и вывод логов
				form.find("[type='button']").html("Добавить").attr("type", "submit");
				wmAlert("Ошибка! См. логи. ", "fail");
				console.log(result);
			}
		});
	});
	
});