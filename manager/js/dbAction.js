$(document).ready(function(){
	
	let current_db = $("#databases").find("li.active").text(); // Текущая база данных
	let current_table; // Текущая таблица
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
			// Вывод ошибки
			if(result.tables.error){
				wmAlert(result.tables.error, "fail");
				return false;
			}
			
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
		current_table = $(this).text().trim(); // Название таблицы для выборки из БД
		
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
				"table": current_table,
				"db": current_db,
				"limit_first": 0,
				"limit_second": limit,
				"user-token": localStorage.getItem("user_token"),
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				// Вывод ошибки
				if(result.data.error){
					wmAlert(result.data.error, "fail");
					return false;
				}
				
				$("#db-name").append(" > " + current_table); // Добавление название таблицы к заголовку
				
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
				
				// Определение столбца с primary_key
				if(result.primary_field){
					setTimeout(function(){ // Небольшой таймаут для отрисовки заголовков полей
						$("th").each(function(){
							if($(this).text() == result.primary_field){
								$(this).attr("data-primary", true);
								return false;
							}
						});
					}, 100);
				} else wmAlert("Таблица не содержит уникального столбца. Обновление ячеек невозможно.");
				
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
							"table": current_table,
							"db": current_db,
							"limit_first": lim,
							"limit_second": limit,
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
	
	// Обновление выбранного значения
	$("#db-view").on("dblclick", "tbody[data-type='table-view'] td", function(){
		// Проверка на содержание первичного ключа в таблице
		if(!$("#db-view [data-primary]").length) return false;
		
		$(this).attr("contentEditable", true);
		$(this).focus();
		
		// Подготовка необходимых значений
		let changed_field = $("#db-view th:eq(" + $(this).index() + ")").text();
		let changed_value, last_value = $(this).text();
		let primary_field = $("#db-view [data-primary]").text();
		let primary_value = $(this).parent().find("td:eq(" + $("#db-view [data-primary]").index() + ")").text();
		let $that = $(this);
		
		function update(){
			changed_value = $that.text();
			$that.attr("contentEditable", false);
			
			// Если значение не менялось, выход из функции
			if(changed_value === last_value) return false;
			
			// Отправка изменений
			$.ajax({
				url: config.api_db_action + "/update",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"table": current_table,
					"changed_field": changed_field,
					"changed_value": changed_value,
					"primary_field": primary_field,
					"primary_value": primary_value,
					"user-token": localStorage.getItem("user_token"),
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					if(result.response.error) wmAlert(result.response.error, "fail");
				}
			});
		}
		
		// Обновление данных по нажатию клавиши enter
		$that.keydown(function(e){
			if(e.keyCode === 13){
				// Если нет редактируемого поля или клик был совершен по нему, выход из функции
				if(!$that) return false;
				
				update();
				$that = null; // Устранение дублей
			}
		});
		
		// Обновление данных по клику вне блока
		$(document).click(function(e){
			// Если нет редактируемого поля или клик был совершен по нему, выход из функции
			if(!$that || $that.is(e.target)) return false;
			
			update();
			$that = null; // Устранение дублей
		});
		
	});
	
});