let timers = {};

// Прослушивание событий отправки AJAX-запросов для запуска таймера к каждому запросу
$(document).ajaxSend(function(event, xhr, options){
	timers[options.url] = new Date();
})

// Прослушивание успехов AJAX-ивентов и их логирование
$(document).ajaxSuccess(function(event, xhr, options, data){
	// Если запрос был не к облаку или был к логированию, то выход
	if(!options.url.match(/cloud/) || options.url.match(/wm_logs/))
		return false;
	
	// Сборка данных для лога
	let log;
	let operation = options.url.split("/");
	log = operation[operation.length - 3] + "/" + operation[operation.length - 2] + "/" + operation[operation.length - 1];
	log += " " + (new Date() - timers[options.url]);
	let user_info = JSON.parse(localStorage.getItem("user_info"));
	log += " " + user_info.email;
	
	// Логирование запроса
	$.ajax({
		url: config.api_logs + "/set",
		type: "POST",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"user-token": localStorage.getItem("user_token"),
			"log": log
		},
		success: function(){
			// Редирект после логирования получения токена
			if(operation[operation.length - 1] == "token")
				location.href = config.domain;
		}
	});
});