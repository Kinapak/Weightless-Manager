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
							url: "https://russiabase.ru/wm/v0.2.1/manager/js/plugins/dataTables.russian.json"
						}
					});
				
				$('#db-view tbody').attr("data-type", "tables");
				
				// Кнопка добавления новой таблицы
				setTimeout(function(){
					$("#db-view_wrapper .row:eq(0) .col-sm-6:eq(0)").prepend(
						"<p style='margin: 0; padding: 10px 1px;'>" +
						"<span id='insert-table' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer;'>" +
						"Добавить таблицу" +
						"</span>" +
						"</p>"
					);
				}, 100);
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
				if(result.data){
					if(result.data.error){
						wmAlert(result.data.error, "fail");
						return false;
					}
				}
				
				// Добавление названия таблицы к заголовкам
				$("#db-name").append(" > " + current_table);
				$("title").append(" > " + current_table);
				
				// Активация хлебной крошки к базе данных
				$("#db-name span").attr("id", "to-db").attr("style", "border-bottom: 1px dashed #d8d8d8; cursor: pointer;");
				
				// Обработка клика по хлебной крошке
				$("#to-db").click(function(){
					viewDB();
				});
				
				$("#db-loading").css("display", "none");
				
				// Добавление кнопок управления таблицей с таймаутом для отрисовки полей
				setTimeout(function(){
					// Вставить строку
					$("#db-view_length").append(
						"<span id='insert-row' style='border-bottom:1px dashed #d8d8d8;cursor:pointer;margin-left:15px;'>" +
						"Вставить строку" +
						"</span>"
					);
					
					// Удалить таблицу
					$("#db-view_length").append(
						"<span id='drop-table' class='text-danger' style='border-bottom:1px dashed #ff6656;cursor:pointer;margin-left:15px;'>" +
						"Удалить таблицу" +
						"</span>"
					);
					
					// Очистить таблицу
					$("#db-view_length").append(
						"<span id='truncate-table' class='text-danger' style='border-bottom:1px dashed #ff6656;cursor:pointer;margin-left:15px;'>" +
						"Очистить таблицу" +
						"</span>"
					);
				}, 100);
				
				// Инициализация новой таблицы с колонками
				dt = $('#db-view').DataTable({
					columns: result.cols,
					pageLength: 50,
					language: {
						url: "https://russiabase.ru/wm/v0.2.1/manager/js/plugins/dataTables.russian.json"
					}
				});
				
				// Добавление полученных строк с данными по столбцам
				if(result.data){
					let table_data = [];
					$.each(result.data, function(id, val){
						let dt = {};
						
						$.each(result.cols, function(col_id, col){
							dt[col.title] = val[col.title];
						});
						
						table_data.push(dt);
					});
					dt.rows.add(result.data).draw();
				}
				
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
						
						// Кнопка удаления строки из таблицы
						$.each($("tbody tr"), function(){
							$($(this)
								.find($("td"))[$("#db-view [data-primary]").index()])
								.append("<i class='fa fa-close fa-lg remove-row' title='Удалить строку'></i>");
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
	
	// Обработка новой строки в таблице
	$(".responsive-table").on("click", "#insert-row", function(){
		// Повторное нажатие закрывает добавление строки
		if($("#new-row").length){
			$("#new-row").parent().remove();
			return false;
		}
		
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
	
	// Удаление строки в таблице
	$(".responsive-table").on("click", ".remove-row", function(){
		if(!confirm("Подтвердите удаление")) return false;
		
		// Подготовка значений
		let primary_field = $("#db-view [data-primary]").text();
		let primary_value = $(this).parent().text();
		$(this).removeClass("fa-close").addClass("fa-spinner fa-pulse");
		let $this = $(this);
		
		// Удаление строки из таблицы БД
		$.ajax({
			url: config.api_db_action + "/remove",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"table": current_table,
				"primary_field": primary_field,
				"primary_value": primary_value,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				// Удаление строки из таблицы на клиенте
				$this.parent().parent().remove();
			}
		});
	});
	
	// Удаление таблицы
	$(".responsive-table").on("click", "#drop-table", function(){
		if(!confirm("Подтвердите удаление")) return false;
		
		$(this).text("").css("border", "none").addClass("fa fa-spinner fa-pulse");
		
		// Удаление таблицы из БД
		$.ajax({
			url: config.api_db_action + "/dropTable",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"table": current_table,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				wmAlert("Таблица " + current_table + " успешно удалена", "success");
				
				viewDB();
			}
		});
	});
	
	// Очистка таблицы
	$(".responsive-table").on("click", "#truncate-table", function(){
		if(!confirm("Подтвердите очистку таблицы")) return false;
		
		let $this = $(this);
		$(this).text("").css("border", "none").addClass("fa fa-spinner fa-pulse");
		
		// Очистка таблицы
		$.ajax({
			url: config.api_db_action + "/truncateTable",
			type: "POST",
			dataType: "json",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("user_token")
			},
			data: {
				"db": current_db,
				"table": current_table,
				"iam-token": localStorage.getItem("IAM_token")
			},
			success: function(result){
				if(result.response.error){
					wmAlert(result.response.error, "fail");
					return false;
				}
				
				dt.clear().draw();
				
				$this.text("Очистить таблицу").css("border-bottom", "1px dashed #ff6656").removeClass("fa fa-spinner fa-pulse");
			}
		});
	});
	
	// Создание таблицы в БД
	$(".responsive-table").on("click", "#insert-table", function(){
		// Добавление строк для создания таблицы
		function newTableAddRow(count){
			for(var i = 0; i < count; i++)
				$("#new-table").append(
					"<tr>" +
					"<td contenteditable='true' data-name='name'></td>" +
					"<td><select class='form-control' style='width: 100%; height: 30px;' data-name='type'>" +
					"<option value='INT'>INT</option>" +
					"<option value='VARCHAR'>VARCHAR</option>" +
					"<option value='TEXT'>TEXT</option>" +
					"<option value='DECIMAL'>DECIMAL</option>" +
					"<option value='FLOAT'>FLOAT</option>" +
					"<option value='DOUBLE'>DOUBLE</option>" +
					"<option value='BOOLEAN'>BOOLEAN</option>" +
					"<option value='DATE'>DATE</option>" +
					"<option value='DATETIME'>DATETIME</option>" +
					"<option value='JSON'>JSON</option>" +
					"</select></td>" +
					"<td contenteditable='true' data-name='length'></td>" +
					"<td contenteditable='true' data-name='default'></td>" +
					"<td><select class='form-control' style='width: 100%; height: 30px;' data-name='index'>" +
					"<option value='0'>Нет</option>" +
					"<option value='PRIMARY KEY'>PRIMARY</option>" +
					"<option value='UNIQUE'>UNIQUE</option>" +
					"<option value='INDEX'>INDEX</option>" +
					"<option value='FULLTEXT'>FULLTEXT</option>" +
					"<option value='SPATIAL'>SPATIAL</option>" +
					"</select></td>" +
					"<td><input type='checkbox' data-name='ai'></td>" +
					"</tr>"
				);
		}
		
		// Повторное нажатие закрывает добавление таблицы
		if($("#new-table").length){
			$("#new-table").parent().remove();
			return false;
		}
		
		// Добавление заголовков
		$(this).closest(".row").append(
			"<div class='col-sm-12'>" +
			"<table id='new-table' class='table table-bordered dataTable'>" +
			"<tr><td>Название таблицы:</td><td contenteditable='true' colspan='5' data-name='title'></td></tr>" +
			"<tr><td>Имя</td><td>Тип</td><td>Длина</td><td>По умолчанию</td><td>Индекс</td><td>A_I</td></tr>" +
			"</table>" +
			"<button id='add-table' class='btn btn-round btn-primary' style='transform: scale(0.9);'>Добавить</button>" +
			"<span id='add-table-row' style='border-bottom: 1px dashed #d8d8d8; cursor: pointer; float: right;'>Вставить строку</span>" +
			"</div>"
		);
		
		newTableAddRow(4);
		
		// Сразу фокусировка на поле с названием таблицы
		$("#new-table tr td:eq(1)").focus();
		
		$("#add-table-row").click(function(){
			newTableAddRow(1);
		});
		
		// Отправка новых данных
		$("#new-table").parent().on("click", "#add-table", function(){
			let $this = $(this);
			
			// Отображение загрузки и блокировка кнопки
			$(this).html("<i class='fa fa-spinner fa-pulse fa-lg'></i>");
			$(this).attr("id", "");
			
			let fields = {}; // Поля для добавления
			let name = false; // Ключ каждого поля
			let position = -1; // Позиция каждого поля в таблице (порядок сортировки)
			
			// Сборка полей
			$("#new-table [data-name]").each(function(){
				// Назначение ключа
				if($(this).data("name") == "name"){
					name = $(this).text();
					
					if(!name) return; // Пропуск, если нет ключа
					
					position++;
					fields[name] = {};
					fields[name]["position"] = position;
				}
				if(!name) return; // Пропуск, если нет ключа
				
				// Добавление данных
				if($(this).data("name") == "name" || $(this).data("name") == "length" || $(this).data("name") == "default")
					fields[name][$(this).data("name")] = $(this).text();
				else if($(this).data("name") == "ai")
					fields[name][$(this).data("name")] = $(this).is(":checked");
				else fields[name][$(this).data("name")] = $(this).val();
			});
			
			$.ajax({
				url: config.api_db_action + "/addTable",
				type: "POST",
				dataType: "json",
				headers: {
					"Authorization": "Bearer " + localStorage.getItem("user_token")
				},
				data: {
					"db": current_db,
					"title": $("#new-table [data-name='title']").text(),
					"fields": JSON.stringify(fields),
					"iam-token": localStorage.getItem("IAM_token")
				},
				success: function(result){
					// Вывод ошибки добавления
					if(result.response.error){
						wmAlert(result.response.error, "fail");
						$this.html("Добавить");
						$this.attr("id", "add-table");
						return false;
					}
					
					// Добавление новой таблицы в список
					dt.rows.add([[$("#new-table [data-name='title']").text()]]).draw();
					
					wmAlert("Таблица " + $("#new-table [data-name='title']").text() + " успешно создана", "success");
					
					$this.parent().remove();
				}
			});
		});
	});
	
});