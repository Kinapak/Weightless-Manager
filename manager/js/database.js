$(document).ready(function(){
	
	// Обработка формы на добавление новой базы данных
	$("#add-database").on("submit", function(e){
		e.preventDefault();
		
		let form = $(this);
		
		// Иконка лоадера. Также смена типа кнопки, чтобы данные не отправлялись вдогонку
		$(this).find("[type='submit']").html("<i class='fa fa-spinner fa-pulse fa-lg'></i>").attr("type", "button");
		
		// Обработка селекта
		if(!$(this).find("[name='type']").val()){
			$(this).find("[name='type']").addClass("danger");
			return false;
		} else $(this).find("[name='type']").removeClass("danger");
		
		let data = form.serialize();
		data += "&token=" + localStorage.getItem("token");
		
		$.ajax({
			url: config.api_db_management + "/add",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token")
			},
			data: data,
			success: function(result){
				// Сброс формы и кнопки
				//form.trigger("reset");
				form.find("[type='button']").html("Добавить").attr("type", "submit");
				
				//todo сообщение об успешном добавлении бд
				console.log(result);
			},
			error: function(result){
				// Если ошибка, то сброс кнопки и вывод логов
				form.find("[type='button']").html("Добавить").attr("type", "submit");
				console.log(result);
			}
		});
	});
	
});