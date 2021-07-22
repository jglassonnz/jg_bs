//Copyright JG Software Solutions Limited

$(function(){
    "use strict";
    $('.modal-header button.close').on('click', function() {
        $(this).closest('.modal').modal('hide');
    });
});

function jg_formatDate(date) {
    "use strict";
    var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();
    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
    return [year, month, day].join('-');
}
function jg_createData(organizationURI, url, data, callback) {
    "use strict";
    $.ajax({
        type: "POST",
        contentType: 'application/json',
        dataType: 'json',
        url: organizationURI + "/api/data/v9.1/" + url,
        data: JSON.stringify(data),
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "Prefer": "return=representation"
        },
        success: function(data) {
            callback(data);
        }
    });
}
function jg_updateData(organizationURI, url, data, callback) {
    "use strict";
    $.ajax({
        type: "PATCH",
        contentType: 'application/json',
        dataType: 'json',
        url: organizationURI + "/api/data/v9.1/" + url,
        data: JSON.stringify(data),
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
            "If-Match": "*",
            "Prefer": "return=representation"
        },
        success: function(data) {
            callback(data);
        }
    });
}
function jg_retrieveData(organizationURI, url, callback) {
    "use strict";
    $.ajax({
        type: "GET",
        url: organizationURI + "/api/data/v9.1/" + url,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        },
        success: function(data) {
            callback(data);
        }
    });
}
function jg_deleteData(organizationURI, url, callback) {
    "use strict";
    $.ajax({
        type: "DELETE",
        url: organizationURI + "/api/data/v9.1/" + url,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        },
        success: function() {
            callback();
        }
    });
}