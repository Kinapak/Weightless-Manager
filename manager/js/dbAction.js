$(document).ready(function(){
	
	let current_db = $("#databases").find("li.active").text();
	
	$("#db-name").text(current_db);
	
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
			$('#db-view')
				.append("<thead><tr><th>Таблицы</th></tr></thead>")
				.DataTable({
					data: result.tables.empty || result.tables,
					paging: false
				});
			
			$("#db-loading").remove();
		}
	});
	
});