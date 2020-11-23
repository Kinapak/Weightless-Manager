$(document).ready(function(){
	
	// Подгрузка страниц
	$(".tree a").click(function(e){
		e.preventDefault();
		
		/* Дополнительная проверка токена перед подгрузкой страниц
		* Особенно важно, когда на странице совершаются действия, для которых нужен валидный токен */
		checkToken();
		
		$("#main-view").load("/manager/" + $(this).attr("href"));
	});
	
});