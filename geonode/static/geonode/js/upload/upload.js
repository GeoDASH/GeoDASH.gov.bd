/*jslint nomen: true */
/*global $:true, document:true, define: true, alert:true, requirejs: true  */

'use strict';

var layers = {};

var geogig_stores = {};

define(['underscore',
        'geo-dash/papaparse.min',
        'upload/LayerInfo',
        'upload/FileTypes',
        'upload/path',
        'upload/common',
        'text!templates/upload.html'], function (_, Papa, LayerInfo, fileTypes, path, common, uploadTemplate) {

    var templates = {},
        findFileType,
        initialize,
        log_error,
        info,
        types,
        buildFileInfo,
        displayFiles,
        init_geogig_stores,
        doUploads,
        doSrs,
        doDelete,
        doResume,
        doSuccessfulUpload,
        attach_events,
        checkFiles,
        processLayer,
        getExtension,
        isCsv,
        isOsm,
        readCsvHeader,
        makeDropdownOptions,
        csvRows = [],
        sendOsmFile,
        removeLayer,
        fileTypes = fileTypes;

    $('body').append(uploadTemplate);

    templates.errorTemplate = _.template($('#errorTemplate').html());

    templates.infoTemplate = _.template($('#infoTemplate').html());

    /** Function to log errors to the #global-errors div
     *
     *  @params {options}
     *  @returns {string}
     */
    log_error = function (options) {
        $('#global-errors').append(templates.errorTemplate(options));
    };

    /** Info function takes an object and returns a correctly
     *  formatted bootstrap alert element.
     *
     *  @returns {string}
     */
    info = function (options) {
        return templates.infoTemplate(options);
    };


    /* Function to iterates through all of the known types and returns the
     * type if it matches, if not return null
     * @params {File}
     * @returns {object}
     */
    findFileType = function (file) {
        var i, type;
        for (i = 0; i < types.length; i += 1) {
            type = types[i];
            if (type.isType(file)) {
                return {type: type, file: file};
            }
        }
    };

    /** Function to ...
     *
     *  @params
     *  @returns
     */
    buildFileInfo = function (files) {
        var name, info;

        for (name in files) {
            // filter out the prototype properties

            if (files.hasOwnProperty(name)) {

                // check to see if the layer was already defined

                if (layers.hasOwnProperty(name)) {
                    info = layers[name];
                    $.merge(info.files, files[name]);
                    info.displayFiles();
                } else {
                    info = new LayerInfo({
                        name: name,
                        files: files[name]
                    });
                    info.collectErrors();
                    layers[name] = info;
                }
            }
        }
    };

    removeLayer = function (file_queue, name) {
        console.log(layers[name]);
          delete layers[name];
          displayFiles(file_queue);

    };

    /** Function to ...
     *
     *  @params
     *  @returns
     */
    displayFiles = function (file_queue) {
        file_queue.empty();

        var permission_edit = $("#permission-edit")

        permission_edit.show();
        var hasFullPermissionsWidget = false;

        $.each(layers, function (name, info) {
            if (!info.type) {
                log_error({
                    title: 'Unsupported type',
                    message: interpolate(gettext('The file %s is an unsupported file type, please select another file.'),[info.files[0].name])
                });
                delete layers[name];
            } else {
                info.display(file_queue,removeLayer);
                if(info.type.format=='vector'){
                    hasFullPermissionsWidget = true;
                };
            }
        });

        if(!hasFullPermissionsWidget){permission_edit.hide()};
    };

    /** Function to ...
     *
     *  @params
     *  @returns
     */
    checkFiles = function(){
        var files = layers[Object.keys(layers)[0]]['files'];
        var types = [];
        for (var i = 0; i<files.length; i++){
            var base_name = files[i].name.split('.')[0];
            var ext = files[i].name.split('.').pop().toLowerCase();
            if ($.inArray(ext,types) == -1){
                types.push(ext);
            }

            var mosaic_is_valid = true;
            var is_granule = $('#' + base_name + '-mosaic').is(':checked');

            var is_time_enabled = $('#' + base_name + '-timedim').is(':checked');
            var is_time_valid = is_time_enabled && !$('#' + base_name + '-timedim-value-valid').is(':visible');

            if (is_granule && is_time_enabled) {
                mosaic_is_valid = is_time_valid;
            }

            var is_adv_options_enabled = $('#' + base_name + '-timedim-presentation').is(':checked');
            var default_value = $('#' + base_name + '-timedim-defaultvalue-format-select').val();

            if (default_value == 'NEAREST' || default_value == 'FIXED') {
                var is_reference_value_valid = is_adv_options_enabled && !$('#' + base_name + '-timedim-defaultvalue-ref-value-valid').is(':visible')
                mosaic_is_valid = is_time_valid && is_reference_value_valid;
            }

            if (is_granule && !mosaic_is_valid) {
                return false;
            }

        }
        var matched = false;
        for (var file_type in fileTypes){
            var required = fileTypes[file_type]['requires'];
            if ($(required).not(types).length == 0){
                matched = true;
                break;
            }
            else{
                matched = false;
            }
        }
        return matched;
    }

    doDelete = function(event) {
        var target = event.target || event.srcElement;
        var id = target.id.split("-")[1];
        var target = "/upload/delete/" + id;
        $.ajaxQueue({
            url: target,
            async: false,
            contentType: false,
        }).done(function (resp) {
            var div = "#incomplete-" + id;
            $(div).remove();

            if ($('#incomplete-download-list > div[id^=incomplete]').length == 0){
                $('#incomplete-download-list').hide();
            }

        }).fail(function (resp) {
            //
        });
    };

    doResume = function(event) {
        var target = event.target || event.srcElement;
        var id = target.id.split("-")[1];
        var target = "/upload/?id=" + id;
        $.ajaxQueue({
            url: target,
            async: false,
            contentType: false,
        }).done(function (data) {
          if('redirect_to' in data) {
                common.make_request({
                    url: data.redirect_to,
                    async: false,
                    failure: function (resp, status) {
                        common.logError(resp, status);
                    },
                    success: function (resp, status) {
                        window.location = resp.url;
                    }
                });
            } else if ('url' in data) {
                window.location = data.url;
            } else {
                common.logError("unexpected response");
            }
        }).fail(function (resp) {
            common.logError(resp);
        });
    };

    doSrs = function (event) {
        var form = $("#srsForm")
        $.ajaxQueue({
           type: "POST",
           url: '/upload/srs',
           data: form.serialize(), // serializes the form's elements.
           success: function(data)
           {
               if('redirect_to' in data) {
                    common.make_request({
                        url: data.redirect_to,
                        async: false,
                        failure: function (resp, status) {common.logError(resp); },
                        success: function (resp, status) {
                            window.location = resp.url;
                        }
                    });
                } else if ('url' in data) {
                    window.location = data.url;
                } else {
                    common.logError("unexpected response");
                }
           },
           failure: function (resp, status) {
                common.logError(resp);
           }
        });
        return false;
    };


    /** Function to Upload the selected files to the server
     *
     *  @returns false
     */
    doUploads = function () {
        if ($.isEmptyObject(layers)) {
            common.logError('Please provide layer files');
            return false;
        }

        var checked = checkFiles();
        if ($.isEmptyObject(layers) || !checked) {
            alert(gettext('You are trying to upload an incomplete set of files or not all mandatory options have been validated.\n\nPlease check for errors in the form!'));
        } else {
            $.each(layers, function (name, layerinfo) {
                layerinfo.uploadFiles();
            });
        }
        return false;
    };

    /** Function to ...
     *
     *  @returns false
     */
    init_geogig_stores = function() {
        $.ajax({
            url: '/gs/rest/stores/geogig/',
            async: true,
            contentType: false,
        }).done(function (resp) {
            geogig_stores = JSON.parse(resp);
        }).fail(function (resp) {
            //
        });
    };


    /** Initialization function. Called from main.js
     *
     *  @params
     *  @returns
     */
    initialize = function (options) {
        var file_input = document.getElementById('file-input'),
            dropZone = document.querySelector(options.dropZone),
            file_queue = $(options.file_queue),
            doClearState = function () {
                // http://stackoverflow.com/questions/1043957/clearing-input-type-file-using-jquery/13351234#13351234
                $("#file-input").wrap('<form>').closest('form').get(0).reset();
                $("#file-input").unwrap();
                // set the global layer object to empty
                layers = {};
                // redraw the file display view
                displayFiles(file_queue);
            },
            runUpload = function (files) {
                buildFileInfo(_.groupBy(files, path.getName));
                displayFiles(file_queue);
            },
            handleDragOver = function (e) {
                // this seems to be required in order for dragging and dropping to work
                e.stopPropagation();
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                return false;
            };

        // setup the drop zone target
        dropZone.addEventListener('dragover', handleDragOver, false);

        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            var files = e.dataTransfer.files;
            processLayer(files);
            runUpload(files);
        });

        $(options.form).change(function (event) {
            //console.log(event.target.files);
            // this is a mess
            var files = event.target.files;
            processLayer(files);
            buildFileInfo(_.groupBy(file_input.files, path.getName));
            displayFiles(file_queue);
        });
        $(options.clear_button).on('click', doClearState);
        $(options.upload_button).on('click', doUploads);
        $("[id^=delete]").on('click', doDelete);
        $("[id^=resume]").on('click', doResume);
        if (geogig_enabled) {
            init_geogig_stores();
        }
    };

    processLayer = function (files) {
        var isThatOsm = false;
        var isThatCsv = false;
        var file = null;
        for(var i=0; i<files.length; i++){
            //var isThatOsm = isOsm(getExtension(files[i].name));
            var isThatCsv = isCsv(getExtension(files[i].name));
            if(isThatOsm || isThatCsv){
                file = files[i];
                break;
            }
        }
        /*if(isThatOsm){
            $("#osmLayerSection").show();
            //$("#permissionListAndSubmitSection").hide();
            //sendOsmFile(files);
        } else {
            $("#osmLayerSection").hide();
        }*/
        if(isThatCsv){
            readCsvHeader(file);
        }
    };

    getExtension = function (filename) {
        var parts = filename.split('.');
        return parts[parts.length - 1];
    };

    isCsv = function (filename) {
        var ext = getExtension(filename);
        switch (ext.toLowerCase()) {
            case 'csv':
                //etc
                return true;
        }
        return false;
    };

    isOsm = function (filename) {
        var ext = getExtension(filename);
        switch (ext.toLowerCase()) {
            case 'osm':
                //etc
                return true;
        }
        return false;
    };

    makeDropdownOptions = function(csvRows){
        //<option selected='selected' value="point">Point layer</option>
        //<option value="line">Line layer</option>
        //<option value="multi_line">Multi line layer</option>
        //<option value="multipolygon">Multipolygon layer</option>
        var csvHeaders = csvRows[0];
        var options = '';
        for(var i=0; i<csvHeaders.length; i++){
            if(i==0){
                options += '<option selected="selected" value="'+csvHeaders[i]+'">'+csvHeaders[i]+'</option>';
            } else {
                options += '<option value="'+csvHeaders[i]+'">'+csvHeaders[i]+'</option>';
            }
        }
        $("#csvLattitudeColumnName, #csvLongitudeColumnName, #csvGeomColumnName").html(options);
    };

    readCsvHeader = function (file) {
        csvRows = [];
        Papa.parse(file, {
            //delimiter: ",",
            //newline: "\n",
            header: false,
            //dynamicTyping: false,
            //worker: false,
            preview: 2,
            step: function(results) {
                if(results.data != undefined && results.data[0] != undefined ){
                    csvRows.push(results.data[0]);
                }
                //console.log("Row:", results.data);
                if(csvRows.length >= 2){
                    makeDropdownOptions(csvRows);
                }
            }
        });
    };

    sendOsmFile = function (file) {
        var form_data = new FormData();
        var prog = "";

        var ext = getExtension(file.name);
        form_data.append(ext + '_file', file);

        $.ajaxQueue({
            url: form_target,
            async: true,
            type: "POST",
            data: form_data,
            processData: false,
            contentType: false,
            //xhr: function() {
            //    var req = $.ajaxSettings.xhr();
            //    if (req) {
            //        req.upload.addEventListener('progress', function(evt) {
            //            if(evt.lengthComputable) {
            //                var pct = (evt.loaded / evt.total) * 100;
            //                $('#prog > .progress-bar').css('width', pct.toPrecision(3) + '%');
            //            }
            //        }, false);
            //    }
            //    return req;
            //},
            beforeSend: function () {
            },
            error: function (jqXHR) {
                console.log(jqXHR);
            },
            success: function (resp, status) {
                console.log(resp, status);
            }
        });
    };

    // public api

    return {
        initialize: initialize,
        doSrs: doSrs,
        doDelete: doDelete,
        doResume: doResume
    };

});
