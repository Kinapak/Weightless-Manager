$(document).ready(function(){
	
	let current_db = $(".databases-list").find("li.active").text(); // Текущая база данных
	let dt; // Экземпляр таблицы для DataTable
	
	// Отображение таблиц базы данных при загрузке страницы
	$.ajax({
		url: config.api_db_redis + "/keys",
		type: "POST",
		dataType: "json",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"db": current_db,
			"iam-token": localStorage.getItem("IAM_token")
		},
		success: function(result){
			// Вывод ошибки
			if(result.response){
				wmAlert(result.response.error, "fail");
				return false;
			}
			
			// Если уже инициализирован экземпляр таблицы, необходимо его удалить
			if(dt){
				dt.destroy();
				$('#db-view').html("");
			}
			
			// Установка названия текущей БД в заголовках
			$("#db-name").html("<span>" + current_db + "</span>");
			$("title").text("Weightless Manager | " + current_db);
			
			// Отображение пар ключ-значение
			dt = $('#db-view').DataTable({
				columns: [
					{
						data: "Ключ",
						title: "Ключ"
					},
					{
						data: "Значение",
						title: "Значение"
					}
				],
				data: result.keys || [result.empty],
				pageLength: 50,
				language: {
					url: "https://russiabase.ru/wm/v0.4.0/manager/js/plugins/dataTables.russian.json"
				}
			});
			
			$('#db-view tbody').attr("data-type", "keys");
			
			$("#db-loading").css("display", "none");
		},
		error: function(error){
			wmAlert("Ошибка подключения", "fail");
			console.log(error);
		}
	});
	
});