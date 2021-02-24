$(document).ready(function(){
	
	let current_db = $("#databases").find("li.active").text(); // Текущая база данных
	let current_table; // Текущая таблица
	let dt; // Экземпляр таблицы для DataTable
	let viewDB; // Текущее представление таблиц в базе данных
	
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
			"iam-token": localStorage.getItem("IAM_token")
		},
		success: function(result){
			// Вывод ошибки
			if(result.tables.error){
				wmAlert(result.tables.error, "fail");
				return false;
			}
			
			// Выгрузка результатов в таблицу с возможностью повторного использования
			viewDB = function(){
				// Если уже инициализирован экземпляр таблицы, необходимо его удалить
				if(dt){
					dt.destroy();
					$('#db-view').html("");
				}
				
				// Установка названия текущей БД в заголовках
				$("#db-name").html("<span>" + current_db + "</span>");
				$("title").text("Weightless Manager | " + current_db);
				
				// Отображение шапки и данных
				dt = $('#db-view')
					.append("<thead><tr><th>Таблицы</th></tr></thead>")
					.DataTable({
						data: result.tables.empty || result.tables,
						paging: false,
						language: {
							url: "manager/js/plugins/dataTables.russian.json"
						}
					});
				
				$('#db-view tbody').attr("data-type", "tables");
			}
			
			viewDB();
			
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
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				// Вывод ошибки
				if(result.data.error){
					wmAlert(result.data.error, "fail");
					return false;
				}
				
				// Добавление названия таблицы к заголовкам
				$("#db-name").append(" > " + current_table);
				$("title").append(" > " + current_table);
				
				// Активация хлебной крошки к базе данных
				$("#db-name span").attr("id", "to-db").attr("style", "border-bottom: 1px dashed #d8d8d8; cursor: pointer;");
				
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
						url: "manager/js/plugins/dataTables.russian.json"
					}
				});
				
				// Добавление полученных строк с данными
				dt.rows.add(result.data).draw();
				
				$('#db-view tbody').attr("data-type", "table-view");
				
				// Добавление кнопки вставки новых строк с таймаутом для отрисовки полей
				setTimeout(function(){
					$("#db-view_length").append(
						"<span id='insert-row' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer; margin-left: 15px;'>" +
						"Вставить строку" +
						"</span>"
					);
				}, 100);
				
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
				
				// Обработка клика по хлебной крошке
				$("#to-db").click(function(){
					viewDB();
				});
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
	
	$(".responsive-table").on("click", "#insert-row", function(){
		// Добавление строки для новых значений над таблицей
		$(this).closest(".row").append(
			"<div class='col-sm-12'>" +
			"<table id='new-row' class='table table-bordered dataTable'><tr></tr></table>" +
			"<button id='add-row' class='btn btn-round btn-primary' style='transform: scale(0.9);'>Добавить</button>" +
			"</div>"
		);
		
		// Добавление новых ячеек с шириной, как в таблице
		$("#db-view th").each(function(){
			$("#new-row tr").append(
				"<td style='width: " + $(this).css("width") + ";' contenteditable='true' data-parent='" + $(this).text() + "'></td>"
			);
		});
		
		// Сразу фокусировка на первом поле
		$("#new-row tr td:eq(0)").focus();
		
		// Отправка новых данных
		$("#new-row").parent().on("click", "#add-row", function(){
			let $this = $(this);
			
			// Отображение загрузки и блокировка кнопки
			$(this).html("<i class='fa fa-spinner fa-pulse fa-lg'></i>");
			$(this).attr("id", "");
			
			// Инициализация новых значений
			let fields = {};
			$("#new-row tr td").each(function(){
				fields[$(this).data("parent")] = $(this).text();
			});
			
			$.ajax({
				url: config.api_db_action + "/insert",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"table": current_table,
					"fields": JSON.stringify(fields),
					"primary_field": $("#db-view [data-primary]").text(),
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					// Вывод ошибки добавления
					if(result.response.error){
						wmAlert(result.response.error, "fail");
						$this.html("Добавить");
						$this.attr("id", "add-row");
						return false;
					}
					
					// Добавление новой строки к таблице
					if(result.last_row) dt.rows.add([result.last_row]).draw();
					else dt.rows.add([fields]).draw();
					
					$this.parent().remove();
				}
			});
		});
	});
	
});