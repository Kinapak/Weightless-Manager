$(document).ready(function(){
	
	$(".add-key").on("submit", function(e){
		e.preventDefault();
		
		// Инициализация ключа и типа
		let type = $(this).data("type");
		let key = $(this).find("[name='key']").val();
		
		// Блокировка кнопки
		$(this).find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
		
		let form = $(this);
		
		$.ajax({
			url: config.api_app_management + "/addKey",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"type": type,
				"key": key,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				// Если успешно, то сброс формы и вывод всего остального, иначе вывод ошибки
				if(!result.response.error){
					wmAlert("Параметры ключа успешно обновлены", "success");
					form.trigger("reset");
				} else wmAlert(result.response.error, "fail");
				
				// Сброс кнопки
				form.find("[type='button']").html("Обновить").attr("type", "submit");
			},
			error: function(result){
				// Если ошибка, то сброс кнопки и вывод логов
				form.find("[type='button']").html("Обновить").attr("type", "submit");
				wmAlert("Ошибка! См. логи. ", "fail");
				console.log(result);
			}
		});
	});
	
});