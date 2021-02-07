$(document).ready(function(){
	
	let current_db = $("#databases").find("li.active").text(); // Текущая база данных
	let dt; // Экземпляр таблицы для DataTable
	
	$("#db-name").text(current_db); // Установка названия текущей БД в заголовке
	
	// Отображение таблиц базы данных при загрузке страницы
	$.ajax({
		url: config.api_db_action + "/tables",
		type: "POST",
		dataType: "json",
		headers: {
			"Authorization": "Bearer " + localStorage.getItem("user_token")
		},
		data: {
			"db": current_db,
			"user-token": localStorage.getItem("user_token"),
			"iam-token": localStorage.getItem("IAM_token")
		},
		success: function(result){
			// Отображение шапки и данных
			dt = $('#db-view')
				.append("<thead><tr><th>Таблицы</th></tr></thead>")
				.DataTable({
					data: result.tables.empty || result.tables,
					paging: false,
					language: {
						url: "/manager/js/plugins/dataTables.russian.json"
					}
				});
			$('#db-view tbody').attr("data-type", "tables");
			
			$("#db-loading").css("display", "none");
		}
	});
	
	// Просмотр таблицы
	$("#db-view").on("click", "tbody[data-type='tables'] td", function(){
		let table = $(this).text().trim(); // Название таблицы для выборки из БД
		
		// Удаление текущей таблицы
		dt.destroy();
		$('#db-view').html("");
		$("#db-loading").css("display", "block");
		
		let limit = 10000; // Лимит на кол-во запрашиваемых строк для разделения запросов
		
		$.ajax({
			url: config.api_db_action + "/table",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"table": table,
				"db": current_db,
				"limit": "0, " + limit,
				"user-token": localStorage.getItem("user_token"),
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				$("#db-name").append(" > " + table); // Добавление название таблицы к заголовку
				
				$("#db-loading").css("display", "none");
				
				// Обработка пустой таблицы
				if(result.data.empty){
					$("#db-view").html(result.data.empty);
					return false;
				}
				
				// Инициализация колонок
				let cols = [];
				$.each(result.data[0], function(id, val){
					cols.push({title: id, data: id});
				});
				
				// Инициализация новой таблицы с колонками
				dt = $('#db-view').DataTable({
					columns: cols,
					pageLength: 50,
					language: {
						url: "/manager/js/plugins/dataTables.russian.json"
					}
				});
				
				// Добавление полученных строк с данными
				dt.rows.add(result.data).draw();
				
				$('#db-view tbody').attr("data-type", "table-view");
				
				// Рекурсивная функция получения следующих частей данных из таблицы
				function next(lim){
					$.ajax({
						url: config.api_db_action + "/table",
						type: "POST",
						dataType: "json",
						headers: {
							"Authorization": "Bearer " + localStorage.getItem("user_token")
						},
						data: {
							"table": table,
							"db": current_db,
							"limit": lim + ", " + limit,
							"user-token": localStorage.getItem("user_token"),
							"iam-token": localStorage.getItem("IAM_token")
						},
						success: function(result){
							// Добавление полученных строк с данными, запрос следующих, пока не будет пустого результата
							if(result.data){
								dt.rows.add(result.data).draw();
								next(lim + limit);
							}
						}
					});
				}
				
				next(limit);
			},
			error: function(error){
				console.log(error);
				wmAlert("Что-то пошло не так... См. логи", "fail");
			}
		});
	});
	
});