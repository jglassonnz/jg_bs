var organizationURI = "https://jgsolutions.crm6.dynamics.com";

function formatDate(date) {
    //var d = new Date(date.setDate(date.getDate() - date.getDay()));
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    

    /*var day = d.getDate();
    var month = (d.getMonth()+1);
    var year = d.getFullYear();*/

    

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}
var weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday', 'Sunday'];
$(function(){
    populateJobs();

    $('.modal-header button.close').on('click', function() {
        $(this).closest('.modal').modal('hide');
    });
    $('#selectJobModal .modal-body #crm-job-name').on('change', function(){
        if($(this).children("option:selected").data("hascodes") == 1) {
            retrieveData("cr0f1_timecodeses?$filter=statecode eq 0 and _cr0f1_job_value eq '"+$(this).children("option:selected").val()+"'&$orderby=cr0f1_name", function(data){
                data = data.value;
                $('#crm-timesheets-add-timecode').children().remove();
                $('#crm-timesheets-add-timecode').append($('<option value=null></option>'))
                for (var i = 0; i < data.length; i++) {
                    $('#crm-timesheets-add-timecode').append($('<option value="'+data[i].cr0f1_timecodesid+'">'+data[i].cr0f1_name+'</option>'))
                }
                $('#crm-timesheets-add-coderow').css('display','flex');
            });
        }
        else {
            $('#crm-timesheets-add-timecode').children().remove();
            $('#crm-timesheets-add-coderow').css('display','none');
        }
    });
    $('#crm-timesheets-dateselector').on('change', function(){
        var date = new Date(this.value);
        var startfinish = updateTableHeaders(date);
        $('tr.crm-timesheets-jobrow').remove();
        retrieveData("cr0f1_timesheetses?$expand=cr0f1_job,cr0f1_TimeCode&$filter=statecode eq 0 and cr0f1_date ge "+startfinish[0]+" and cr0f1_date le "+startfinish[1], function(data) {
            data = data.value;
            for(var i = 0; i < data.length; i++) {
                entry = data[i];

                var timecode = "";
                if (entry.cr0f1_TimeCode != null) timecode = entry.cr0f1_TimeCode.cr0f1_name;

                addJobRow(entry._cr0f1_job_value, entry.cr0f1_job.cr0f1_name, entry._cr0f1_timecode_value, timecode);

                var cell = getGridCell(entry.cr0f1_job.cr0f1_name, timecode, entry.cr0f1_date.split('T')[0]);

                $(cell).text(entry.cr0f1_hours).attr('data-entryid',entry.cr0f1_timesheetsid);
            }
            updateTimesheetTotals();
        });
    });
    $('#selectJobModal .crm-form').on('submit',function (e) {
        e.preventDefault();
        var jobname = $(this).find('select[name="job"] option:selected').text();
        var jobid = $(this).find('select[name="job"] option:selected').val();
        var timecode = $(this).find('select[name="time_code"] option:selected').text();
        var codeid = $(this).find('select[name="time_code"] option:selected').val();
        $(this).closest('.modal').modal('hide');
        addJobRow(jobid,jobname,codeid,timecode);
        $(this).find('select[name="job"] option:selected').prop("selected", false);
        $(this).find('select[name="job"]').change();
    });
    $('#editTimeEntry .crm-form').on('submit',function (e) {
        e.preventDefault();

        var form = $(this);
        var hours = parseFloat(form.find('#crm-data-hours').val());
        var description = form.find('#crm-data-description').val();
        var charged = parseFloat(form.find('#crm-time-charged').val());
        var date = form.attr('data-date');
        var entryid = form.attr('data-entryid');
        var codeid = form.attr('data-codeid');
        if (codeid != null) codeid = "/cr0f1_timecodeses("+codeid+")";
        var jobid = form.attr('data-jobid');
        var ogJobid = jobid;
        if (jobid != null) jobid = "/cr0f1_jobs("+jobid+")";

        
        dealWithRetainer(charged, hours, entryid, ogJobid, function(actuallyCharged) {
            var json = {
                "cr0f1_hours": hours,
                "cr0f1_entry_description": description,
                "cr0f1_charged": actuallyCharged,
                "cr0f1_date": date,
                "cr0f1_TimeCode@odata.bind": codeid,
                "cr0f1_job@odata.bind": jobid
            };
    
            updateData('cr0f1_timesheetses('+entryid+')', json, function(data) {
                form.closest('.modal').modal('hide');
                form.closest('.modal').find('select[name="job"] option:selected').prop("selected", false);
                form.closest('.modal').find('select[name="job"]').change();
    
                td = $('td[data-editing="true"]');
                td.text(data.cr0f1_hours).attr('data-entryid',data.cr0f1_timesheetsid);
                td.attr('data-editing', null);
    
                clearEditModal();
                updateTimesheetTotals();
            });
        });

    });
    $('#selectJobModal [data-dismiss="modal"]').on('click', function(){
        $(this).closest('.modal').modal('hide');
    });
    $('#editTimeEntry .crm-footer-delete').on('click', function(){
        var entryid = $('#editTimeEntry form').data('entryid');
        $('#editTimeEntry form').attr('data-entryid', null);
        $('#editTimeEntry form').attr('data-hours', null);

        deleteData('cr0f1_timesheetses('+entryid+')', function() {
            td = $('td[data-editing="true"]');
            td.text('').attr('data-entryid',null);
            td.attr('data-editing', null);
            $('#editTimeEntry').modal('hide');
            clearEditModal();
            updateTimesheetTotals();
        });
    });
    $('#editTimeEntry button[data-dismiss="modal"]').on('click', function(){
        $(this).closest('.modal').modal('hide');
        var form = $(this).closest('form');
        td = $('td[data-editing="true"]');
        td.text(form.attr('data-hours')).attr('data-entryid',form.attr('data-entryid'));
        td.attr('data-editing', null);
        clearEditModal();
        updateTimesheetTotals();
    });
    $('#editTimeEntry').on('hidden.bs.modal', function () {
        var form = $(this).find('form');
        td = $('td[data-editing="true"]');
        td.text(form.attr('data-hours')).attr('data-entryid',form.attr('data-entryid'));
        td.attr('data-editing', null);
        clearEditModal();
        updateTimesheetTotals();
    });
    $('button[data-target="#selectJobModal"]').on('click', function(){
        $('#selectJobModal').modal('show');
    });
    $(document).on('click', 'td.crm-timesheets-jobrow:not(:first-child, :last-child, .crm-timesheets-table-totalcol)', function(){
        clearEditModal();
        var $td = $(this);
        var $th = $td.closest('table').find('th').eq($td.index());
        var date = $th.attr('data-date');
        var job_id = $td.attr('data-jobid');
        var code_id = $td.attr('data-codeid');
        var entryid = $td.attr('data-entryid');
        $td.attr('data-editing',true);
        if(entryid == null) {
            var ogJobId = job_id;
            if (code_id != "undefined" && code_id != undefined && code_id != null && code_id != "null") {
                code_id = "/cr0f1_timecodeses("+code_id+")";
            }
            else {
                code_id = null;
            }
            if (job_id != "undefined" && job_id != undefined && job_id != null && job_id != "null") {
                job_id = "/cr0f1_jobs("+job_id+")";
            }
            else {
                job_id = null;
            }
            var json = {
                "cr0f1_hours": 0,
                "cr0f1_charged": 0,
                "cr0f1_date": date,
                "cr0f1_TimeCode@odata.bind": code_id,
                "cr0f1_job@odata.bind": job_id
            };
            createData('cr0f1_timesheetses', json, function(data) {
                populateModal(data);

                var timeentry = data.cr0f1_timesheetsid;

                $('.modal#editTimeEntry').modal('show');

                retrieveData("cr0f1_jobs?$filter=statecode eq 0 and (cr0f1_monthlyretainer ne 0 and cr0f1_monthlyretainer ne null) and cr0f1_jobid eq '"+ogJobId+"'", function(data) {
                    if (data.value.length == 1) {
                        id = data.value[0].cr0f1_jobid;
                        
                        var json = {
                            "cr0f1_Job@odata.bind": "/cr0f1_jobs("+id+")",
                            "cr0f1_TimeEntry@odata.bind": "/cr0f1_timesheetses("+timeentry+")",
                            "cr0f1_hours": 0
                        }

                        createData("cr0f1_retainers", json, function(data) {
                            console.log(data);
                        });
                        updateTimesheetTotals();
                    }
                });

            });
        }
        else {
            retrieveData('cr0f1_timesheetses('+entryid+')', function(data) {
                populateModal(data); 
                $('.modal#editTimeEntry').modal('show');
                updateTimesheetTotals();
            });
        }
    });
    var selectedDate = new Date();
    $('#crm-timesheets-dateselector').val(formatDate(selectedDate));
    $('#crm-timesheets-dateselector').change();
});
function clearEditModal() {
    var form = $('.modal#editTimeEntry form');
    form.attr('data-date', null);
    form.attr('data-jobid', null);
    form.attr('data-codeid', null);
    form.attr('data-entryid', null);
    form.attr('data-hours', null);
    form.find('input[name="hours"]').val(null);
    form.find('input[name="charge_back"]').attr('checked', false);
    form.find('input[name="charged"]').attr('checked', false);
    form.find('textarea').val(null);
}
function updateTimesheetTotals() {
    $('.crm-timesheets-jobrow[data-column="total"]:not(#total_total)').each(function() {
        var totalcell = $(this);
        var jobid = totalcell.attr('data-jobid');
        var timecode = totalcell.attr('data-codeid');
        if (timecode == "null") timecode = "";
        else timecode = '[data-codeid="'+timecode+'"]';
        var total = 0;
        $('td.crm-timesheets-jobrow[data-jobid="'+jobid+'"]'+timecode+':not([data-column="total"], [data-column="name"])').each(function() {
            var jobcell = $(this);
            if(jobcell.text() != "") total = total + parseFloat(jobcell.text());
        });
        totalcell.text(total);
    });

    $('.crm-timesheets-table-totalcol').each(function() {
        var totalcell = $(this);
        var total = 0;
        var columnname = totalcell.attr('data-column');
        $('.crm-timesheets-jobrow[data-column="'+columnname+'"]:not(.crm-timesheets-table-totalcol)').each(function() {
            var jobcell = $(this);
            if(jobcell.text() != "") total = total + parseFloat(jobcell.text());
        });
        totalcell.text(total);
    });

    var total = 0;
    $('td.crm-timesheets-jobrow[data-column="total"]:not(#total_total)').each(function() {
        var jobcell = $(this);
        if(jobcell.text() != "") total = total + parseFloat(jobcell.text());
    });

    $('td.crm-timesheets-jobrow#total_total').text(total);
}
function populateModal(data) {
    var form = $('.modal#editTimeEntry form');
    form.attr('data-date', data.cr0f1_date.split('T')[0]);
    form.attr('data-jobid', data._cr0f1_job_value);
    form.attr('data-codeid', data._cr0f1_timecode_value);
    form.attr('data-entryid', data.cr0f1_timesheetsid);
    form.attr('data-hours', data.cr0f1_hours);
    form.find('input[name="hours"]').val(data.cr0f1_hours);
    form.find('textarea[name="description"]').val(data.cr0f1_entry_description);
    form.find('input[name="charged"]').val(data.cr0f1_charged);
}
function getGridCell(jobname,timecode,date) {
    if(timecode == null || timecode == undefined) timecode = "";
    var columnID = $('.crm-timesheets-table thead th[data-date="'+date+'"]')[0].id;
    return $('tr[data-id="'+jobname+'-'+timecode+'"] td.crm-timesheets-jobrow[data-column="'+columnID+'"]');
}
function addJobRow(jobid, jobname, codeid, timecode) {
    if(timecode == null || timecode == undefined) timecode = "";
    
    var selected=[];
    var getChildren = $(".crm-timesheets-table-dayheader");
    getChildren.each(function(i,v){
        selected.push([($(v).attr('data-selected'))]);
    })

    if($('#crm-timesheet-row').find('tr[data-id="'+jobname+'-'+timecode+'"]').length == 0) {
        $('#crm-timesheet-row').append($('\
            <tr class="crm-timesheets-jobrow" data-id="'+jobname+'-'+timecode+'" data-jobid="'+jobid+'" data-codeid="'+codeid+'">\
                <td class="crm-timesheets-jobrow" data-column="name" data-jobid="'+jobid+'" data-codeid="'+codeid+'"><h3>'+jobname+'</h3><h5>'+timecode+'</h5></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[0]+'" data-column="sunday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[1]+'" data-column="monday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[2]+'" data-column="tuesday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[3]+'" data-column="wednesday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[4]+'" data-column="thursday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[5]+'" data-column="friday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-selected="'+selected[6]+'" data-column="saturday" data-jobid="'+jobid+'" data-codeid="'+codeid+'"></td>\
                <td class="crm-timesheets-jobrow" data-column="total" data-jobid="'+jobid+'" data-codeid="'+codeid+'">\
            </tr>\
        '));
    }
}
function updateTableHeaders(selectedDate) {
    dateNumber = selectedDate.getDate();
    var firstday = new Date(selectedDate.setDate(selectedDate.getDate() - selectedDate.getDay()));
    var lastday = new Date();
    var headers = $('.crm-timesheets-table-dayheader');
    var isoFirstDay = formatDate(firstday);
    var selectedday;
    for (var i = 0; i < headers.length; i++) {
        var date = new Date(isoFirstDay);
        date.setDate(date.getDate() + i);

        headers[i].dataset.date = formatDate(date);
        var dayString = weekdays[date.getDay()];
        if (date.getDate() == dateNumber) {
            headers[i].dataset.selected = true;
            selectedday = dayString.toLowerCase();
        }
        else {
            headers[i].dataset.selected = false;
        }
        var dateString = date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear();
        headers[i].innerHTML = dayString + "<br>" + dateString;
        lastday = date;
    }

    var footer = $('.crm-timesheets-table-totalcol');

    for (var j = 0; j < footer.length; j++) {
        var td = $(footer[j]);
        if(td.attr('data-column') == selectedday) {
            td.attr('data-selected', true);
        }
        else {
            td.attr('data-selected', false);
        }
    }

    lastday.setDate(lastday.getDate() + 1);


    return [formatDate(firstday), formatDate(lastday)];
}
function populateJobs() {
    retrieveData('cr0f1_jobs?$filter=statecode eq 0&$expand=cr0f1_job_timecode&$orderby=cr0f1_name', function(data) {
        data = data.value;
        for (var i = 0; i < data.length; i++) {
            var id = data[i].cr0f1_jobid;
            var hasCodes = "";
            if (data[i].cr0f1_job_timecode.length > 0) hasCodes = 1;
            var name = data[i].cr0f1_name;
            var line = $('<option value="'+id+'" data-hascodes="'+hasCodes+'">'+name+'</option>');
            $('#crm-job-name').append(line);
        }
    });
}
function createData(url, data, callback) {
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
function updateData(url, data, callback) {
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
function retrieveData(url, callback) {
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
function deleteData(url, callback) {
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
function runningTotal(job_id, callback) {
    retrieveData("cr0f1_retainers?$select=cr0f1_hours&$filter=_cr0f1_job_value eq '"+job_id+"'", function(data) {
        var total = 0.00;
        data = data.value;
        
        for (var i = 0; i < data.length; i++) {
            total = total + parseFloat(data[i].cr0f1_hours);
        }

        callback(total);
    });
}
function dealWithRetainer(charged, hours, entryid, jobid, callback) {
    if (charged < hours) {
        retrieveData("cr0f1_retainers?$select=cr0f1_retainerid&$filter=_cr0f1_timeentry_value eq '"+entryid+"'&$top=1", function(data) {
            if (data.value.length == 1) {
                id = data.value[0].cr0f1_retainerid;
                
                runningTotal(jobid, function(total) {
                    var retainerhours;
                    var retainercharged;
                    if (hours <= total) {
                        retainerhours = hours * -1;
                        retainercharged = hours;
                    }
                    else if(hours > total && total != 0) {
                        retainerhours = total * -1;
                        retainercharged = total;
                    }

                    var json = {
                        "cr0f1_hours": retainerhours
                    }
                    updateData('cr0f1_retainers('+id+')', json, function(data) {
                        console.log(data);
                    });

                    callback(retainercharged);
                });
            }
            else {
                callback(charged);
            }
        });
    }
    else {
        callback(charged);
    }
}
