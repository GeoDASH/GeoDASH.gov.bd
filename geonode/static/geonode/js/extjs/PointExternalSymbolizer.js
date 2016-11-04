
/** FILE: widgets/PointExternalSymbolizer.js **/
/**
 * Copyright (c) 2008-2011 The Open Planning Project
 *
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/** api: (define)
 *  module = gxp
 *  class = PointExternalSymbolizer
 *  base_link = `Ext.Panel <http://extjs.com/deploy/dev/docs/?class=Ext.Panel>`_
 */
Ext.namespace("gxp");

/** api: constructor
 *  .. class:: PointExternalSymbolizer(config)
 *
 *      Form for configuring a point symbolizer.
 */
gxp.PointExternalSymbolizer = Ext.extend(Ext.Panel, {
    /** api: config[symbolizer]
     *  ``Object``
     *  A symbolizer object that will be used to fill in form values.
     *  This object will be modified when values change.  Clone first if
     *  you do not want your symbolizer modified.
     */
    symbolizer: null,
    /** i18n */
    graphicExternalText: "external",
    urlText: "URL",
    opacityText: "opacity",
    symbolText: "Symbol",
    sizeText: "Size",
    rotationText: "Rotation",
    /** api: config[pointGraphics]
     *  ``Array``
     *  A list of objects to be used as the root of the data for a
     *  JsonStore.  These will become records used in the selection of
     *  a point graphic.  If an object in the list has no "value" property,
     *  the user will be presented with an input to provide their own URL
     *  for an external graphic.  By default, names of well-known marks are
     *  provided.  In addition, the default list will produce a record with
     *  display of "external" that create an input for an external graphic
     *  URL.
     *
     * Fields:
     *
     *  * display - ``String`` The name to be displayed to the user.
     *  * preview - ``String`` URL to a graphic for preview.
     *  * value - ``String`` Value to be sent to the server.
     *  * mark - ``Boolean`` The value is a well-known name for a mark.  If
     *      ``false``, the value will be assumed to be a url for an external graphic.
     */
    pointGraphics: null,
    /** api: config[colorManager]
     *  ``Function``
     *  Optional color manager constructor to be used as a plugin for the color
     *  field.
     */
    colorManager: null,
    /** private: property[external]
     *  ``Boolean``
     *  Currently using an external graphic.
     */
    external: null,
    default_color: ['3366CC', 'DC3912', 'FF9900', '109618', '990099', '3B3EAC', '0099C6',
    'DD4477', '66AA00', 'B82E2E', '316395', '994499', '22AA99', 'AAAA11',
    '6633CC', 'E67300', '8B0707', '329262', '5574A6', '3B3EAC'],
    /** private: config[layout]
     *  ``String``
     */
    layout: "form",
    chartTypes: null,
    initComponent: function () {

        if (!this.symbolizer) {
            this.symbolizer = {};
        }
        this.symbolizer.graphicFormat = 'application/chart';
        if (!this.pointGraphics) {
            this.pointGraphics = [
                {display: this.graphicExternalText}
            ];
        }
        this.chartTypes = [
            {display: 'Pie', value: "p"},
            {display: 'Vertical Bars', value: "bvg"},
            {display: 'Horizontal Bars', value: "bhg"}
        ];
        
        //this.external = !!this.symbolizer["externalGraphic"];
        this.external = true;
        delete this.symbolizer["graphicName"];
        if(this.symbolizer["pointRadius"] !== undefined && this.symbolizer["pointRadius"] !== null && 
                this.symbolizer["pointRadius"] !== ''){
            //this.symbolizer["pointRadius"] = this.symbolizer["pointRadius"] * 2;
        } else {
            this.symbolizer["pointRadius"] = 5;
        }
        
        this.defaultUrl = 'http://chart?chf=bg,s,FFFFFF00&cht=p';
        var externalGraphic = this.symbolizer["externalGraphic"];
        var cht = ''; 
        var chd = ''; 
        var chf = ''; 
        var chco = ''; 
        if(externalGraphic !== undefined && externalGraphic !== null && externalGraphic !== ''){
            externalGraphic = externalGraphic.replaceAll('&amp;','&');
            cht = this.getParameterByName('cht',externalGraphic);
            chd = this.getParameterByName('chd',externalGraphic);
            chd = chd.replace('t:','');
            //var chl = this.getParameterByName('chl',externalGraphic);
            var chl = this.getParameterByName('label',externalGraphic);
            if (chl !== undefined && chl !== '' && chl !== null) {
                var chlArr = chl.split('|');
                if (chlArr.length > 0) {
                    var chdArr = chd.split(",");
                    for (var i = 0; i < chdArr.length; i++) {
                        if (chlArr[i] !== undefined && chlArr[i] !== '') {
                            chdArr[i] = chlArr[i] + '=' + chdArr[i];
                        }
                    }
                    chd = chdArr.join(',');
                }
            }
            chf = this.getParameterByName('chf',externalGraphic);
            chco = this.getParameterByName('chco',externalGraphic);
        }
        //console.log(externalGraphic);
        //console.log(cht, chd, chf, chco);
        
        this.urlField = new Ext.form.TextField({
            name: "url",
            editable: false,
            readOnly: true,
            fieldLabel: this.urlText,
            value: this.symbolizer["externalGraphic"],
            hidden: !this.external,
            //hidden: true,
            listeners: {
                change: function (field, value) {
                    this.symbolizer["externalGraphic"] = value;
                    this.fireEvent("change", this.symbolizer);
                },
                scope: this
            },
            width: 100 // TODO: push this to css
        });

        this.graphicPanel = new Ext.Panel({
            border: false,
            collapsed: !this.external,
            layout: "form",
            items: [this.urlField, {
                    xtype: "slider",
                    name: "opacity",
                    fieldLabel: this.opacityText,
                    value: [(this.symbolizer["graphicOpacity"] == null) ? 100 : this.symbolizer["graphicOpacity"] * 100],
                    isFormField: true,
                    listeners: {
                        changecomplete: function (slider, value) {
                            this.symbolizer["graphicOpacity"] = value / 100;
                            this.fireEvent("change", this.symbolizer);
                        },
                        scope: this
                    },
                    plugins: [
                        new GeoExt.SliderTip({
                            getText: function (thumb) {
                                return thumb.value + "%";
                            }
                        })
                    ],
                    width: 100 // TODO: push this to css
                }]
        });

        this.queryField = new Ext.form.TextField({
            name: "query",
            fieldLabel: "Chart Query",
            allowBlank: false,
            value: chd,
            hidden: !this.external,
            listeners: {
                change: function (field, value) {
                    if(value){
                        // ${100 * MALE / PERSONS},${100 * FEMALE / PERSONS}
                        // query
                        var queryObj = this.parseLabelFromQuery(value);
                        var querySection = queryObj.query;
                        var queryValue = querySection.join(',');
                        queryValue = 't:'+queryValue;
                        var urlField = this.urlField.getValue();
                        if(urlField !== undefined && urlField !== null && urlField !== ''){
                            this.defaultUrl = urlField;
                        }
                        var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'chd', queryValue);
                        // end query
                        // 
                        // start label
                        var labelsValue = '';
                        var labels = queryObj.label;
                        if(labels.length > 0){
                            labelsValue = labels.join('|');
                        }
                        //urlValue = this.updateQueryStringParameter(urlValue, 'chl', labelsValue);
                        urlValue = this.updateQueryStringParameter(urlValue, 'label', labelsValue);
                        // end label
                        //
                        // color section enable
                        var colorStr = '';
                        var colorField = this.colorField.getValue();
                        if(colorField !== undefined && colorField !== null && colorField !== ''){
                            //this.default_color[]
                            var colorArr = colorField.split(',');
                            var colorLen = colorArr.length;
                            var querySecLen = querySection.length;
                            if(colorLen !== querySecLen){
                                for(var i=colorLen; i<querySecLen; i++){
                                    colorArr.push(this.default_color[i]);
                                }
                                colorStr = colorArr.join(',');
                                this.colorField.setValue(colorStr);
                            }
                        } else {
                            var colorStrs = [];
                            for(var i=0; i<labels.length; i++){
                                colorStrs.push(this.default_color[i]);
                            }
                            colorStr = colorStrs.join(',');
                            this.colorField.setValue(colorStr);
                        }
                        this.colorField.setValue(colorStr);
                        urlValue = this.updateQueryStringParameter(urlValue, 'chco', colorStr);
                        // end color section
                        //
                        // set url value
                        if (!Ext.isEmpty(urlValue)) {
                            this.symbolizer["externalGraphic"] = urlValue;
                        }
                        var chd = this.getParameterByName('chd',urlValue);
                        if(chd !== undefined && chd !== null && chd !== ''){
                            this.urlField.setValue(urlValue);
                            this.fireEvent("change", this.symbolizer);
                        }
                        // end url value
                    }
                },
                scope: this
            },
            width: 100 // TODO: push this to css
        });
        this.querySection = new Ext.Panel({
            border: false,
            collapsed: !this.external,
            layout: "column",
            items: [{
                    html: '<b style="width:150px;font-size:13px;">Chart Query:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</b>'
                }, this.queryField, {
                    id: "buttonHelpQuery",
                    xtype: "button",
                    text: "",
                    iconCls: "gxp-icon-getfeatureinfo",
                    tooltip: "${100 * MALE / PERSONS},${100 * FEMALE / PERSONS} the chart data is expressed in “text” format, and in particular, the first value is the result of 100 * MALE / PERSONS, where MALE and PERSONS are two attributes of feature being rendered"

                }
            ]
        });
        
        this.backgroundField = new Ext.form.TextField({
            name: "background",
            fieldLabel: "Background",
            value: chf,
            hidden: !this.external,
            listeners: {
                change: function (field, value) {
                    var urlField = this.urlField.getValue();
                    if(urlField !== undefined && urlField !== null && urlField !== ''){
                        this.defaultUrl = urlField;
                    }
                    var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'chf', value);
                    if (!Ext.isEmpty(urlValue)) {
                        this.symbolizer["externalGraphic"] = urlValue;
                    }
                    var cht = this.getParameterByName('cht',urlValue);
                    var chd = this.getParameterByName('chd',urlValue);
                    if ((cht !== undefined && cht !== null && cht !== '') &&
                            (chd !== undefined && chd !== null && chd !== '')) {
                        this.urlField.setValue(urlValue);
                        this.fireEvent("change", this.symbolizer);
                    }
                },
                scope: this
            },
            width: 100 // TODO: push this to css
        });
        
        this.colorField = new Ext.form.TextField({
            id:"txtColorField",
            name: "color",
            fieldLabel: "Chart Colour",
            value: chco,
            hidden: !this.external,
            listeners: {
                change: function (field, value) {
                    if (value) {
                        var colour = value.split(',');
                        var colors = [];
                        for (var i = 0; i < colour.length; i++) {
                            var color = colour[i];
                            colors.push(color.trim());
                        }
                        var colorValue = colors.join(',');
                        
                        // query
                        var queryField = this.queryField.getValue();
                        if(queryField !== undefined && queryField !== null && queryField !== ''){
                            var queryObj = this.parseLabelFromQuery(queryField);
                            var querySection = queryObj.query;
                            var colorArr = colors;
                            var colorLen = colorArr.length;
                            var querySecLen = querySection.length;
                            if(colorLen !== querySecLen){
                                for(var i=colorLen; i<querySecLen; i++){
                                    colorArr.push(this.default_color[i]);
                                }
                                colorValue = colorArr.join(',');
                            }
                            this.colorField.setValue(colorValue);
                        }
                        // end query
                        
                        var urlField = this.urlField.getValue();
                        if (urlField !== undefined && urlField !== null && urlField !== '') {
                            this.defaultUrl = urlField;
                        }
                        var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'chco', colorValue);
                        if (!Ext.isEmpty(urlValue)) {
                            this.symbolizer["externalGraphic"] = urlValue;
                        }
                        var cht = this.getParameterByName('cht', urlValue);
                        var chd = this.getParameterByName('chd', urlValue);
                        if ((cht !== undefined && cht !== null && cht !== '') &&
                                (chd !== undefined && chd !== null && chd !== '')) {
                            this.urlField.setValue(urlValue);
                            this.fireEvent("change", this.symbolizer);
                        }
                    }
                },
                scope: this
            },
            width: 100 // TODO: push this to css
        });
        this.colorSection = new Ext.Panel({
            border: false,
            collapsed: !this.external,
            layout: "column",
            items: [{
                    html: '<b style="width:150px;font-size:13px;">Chart Colour:&nbsp;&nbsp;&nbsp;&nbsp;</b>'
                }, this.colorField, {
                    id: "buttonHelpColor",
                    xtype: "button",
                    text: "",
                    iconCls: "gxp-icon-getfeatureinfo",
                    tooltip: "We can specify the colors of all values, each value, or some values using the chco parameter. This override the usage of the default Background Fills chf parameter, hence it is optional."

                }
            ]
        });
        
        this.items = [{
                xtype: "combo",
                name: "mark",
                editable: false,
                fieldLabel: this.symbolText,
                store: new Ext.data.JsonStore({
                    data: {root: this.pointGraphics},
                    root: "root",
                    fields: ["value", "display", "preview", {name: "mark", type: "boolean"}]
                }),
                value: 0,
                displayField: "display",
                valueField: "value",
                tpl: new Ext.XTemplate(
                        '<tpl for=".">' +
                        '<div class="x-combo-list-item gx-pointsymbolizer-mark-item">' +
                        '<tpl if="preview">' +
                        '<img src="{preview}" alt="{display}"/>' +
                        '</tpl>' +
                        '<span>{display}</span>' +
                        '</div></tpl>'
                        ),
                mode: "local",
                allowBlank: false,
                triggerAction: "all",
                listeners: {
                    select: function (combo, record) {
                        var mark = record.get("mark");
                        var value = record.get("value");
                        if (!mark) {
                            if (value) {
                                this.urlField.hide();
                                this.symbolizer["externalGraphic"] = value;
                            } else {
                                this.urlField.show();
                            }
                            if (!this.external) {
                                this.external = true;
                                var urlValue = this.urlField.getValue();
                                if (!Ext.isEmpty(urlValue)) {
                                    this.symbolizer["externalGraphic"] = urlValue;
                                }
                                delete this.symbolizer["graphicName"];
                                this.updateGraphicDisplay();
                            }
                        } else {
                            if (this.external) {
                                this.external = false;
                                delete this.symbolizer["externalGraphic"];
                                this.updateGraphicDisplay();
                            }
                            this.symbolizer["graphicName"] = value;
                        }
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                },
                width: 100 // TODO: push this to css
            }, {
                xtype: "combo",
                name: "chart_type",
                editable: true,
                fieldLabel: 'Chart Type',
                store: new Ext.data.JsonStore({
                    data: {root: this.chartTypes},
                    root: "root",
                    fields: ["value", "display", "preview"]
                }),
                value: cht === '' ? 'p' : cht,
                displayField: "display",
                valueField: "value",
                tpl: new Ext.XTemplate(
                        '<tpl for=".">' +
                        '<div class="x-combo-list-item gx-pointsymbolizer-mark-item">' +
                        '<tpl if="preview">' +
                        '<img src="{preview}" alt="{display}"/>' +
                        '</tpl>' +
                        '<span>{display}</span>' +
                        '</div></tpl>'
                        ),
                mode: "local",
                allowBlank: false,
                triggerAction: "all",
                listeners: {
                    select: function (combo, record) {
                        var value = record.get("value");
                        if(value){
                            var urlField = this.urlField.getValue();
                            if(urlField !== undefined && urlField !== null && urlField !== ''){
                                this.defaultUrl = urlField;
                            }
                            var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'cht', value);
                            if (!Ext.isEmpty(urlValue)) {
                                this.symbolizer["externalGraphic"] = urlValue;
                            }
                            var chd = this.getParameterByName('chd',urlValue);
                            if ((chd !== undefined && chd !== null && chd !== '')) {
                                this.urlField.setValue(urlValue);
                                this.fireEvent("change", this.symbolizer);
                            }
                        }
                    },
                    scope: this
                },
                width: 100 // TODO: push this to css
            }, 
            this.querySection,
            //this.backgroundField,
            this.colorSection,
            {
                xtype: "textfield",
                name: "size",
                fieldLabel: this.sizeText,
                value: this.symbolizer["pointRadius"] && this.symbolizer["pointRadius"] * 2,
                listeners: {
                    change: function (field, value) {
                        this.symbolizer["pointRadius"] = value / 2;
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                },
                width: 100 // TODO: push this to css
            }, {
                xtype: "textfield",
                name: "rotation",
                fieldLabel: this.rotationText,
                value: this.symbolizer["rotation"],
                listeners: {
                    change: function (field, value) {
                        this.symbolizer["rotation"] = value;
                        this.fireEvent("change", this.symbolizer);
                    },
                    scope: this
                },
                width: 100 // TODO: push this to css
            }, this.graphicPanel
        ];

        this.addEvents(
                /**
                 * Event: change
                 * Fires before any field blurs if the field value has changed.
                 *
                 * Listener arguments:
                 * symbolizer - {Object} A symbolizer with stroke related properties
                 *     updated.
                 */
                "change"
                );

        gxp.PointExternalSymbolizer.superclass.initComponent.call(this);

    },
    updateGraphicDisplay: function () {
        if (this.external) {
            this.graphicPanel.expand();
        } else {
            this.graphicPanel.collapse();
        }
        // TODO: window shadow fails to sync
    },
    getParameterByName: function(name, url){
        if (!url) {
          return '';
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    },
    updateQueryStringParameter: function (uri, key, value) {
        var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
        var separator = uri.indexOf('?') !== -1 ? "&" : "?";
        if (uri.match(re)) {
            return uri.replace(re, '$1' + key + "=" + value + '$2');
        } else {
            return uri + separator + key + "=" + value;
        }
    },
    parseLabelFromQuery: function (value) {
        var totLabels = value.split(',');
        var labels = [];
        var sections = [];
        for (var i = 0; i < totLabels.length; i++) {
            var label = totLabels[i];
            var section = label.trim();
            var secs = section.split('=');
            if (secs.length > 1) {
                sections[i] = secs[1];
                labels[i] = secs[0].replace(' ', '');
            } else {
                sections[i] = secs[0];
            }
        }
        return {
            query: sections,
            label: labels
        };
    }
});

/** api: xtype = gxp_pointexternalsymbolizer */
Ext.reg('gxp_pointexternalsymbolizer', gxp.PointExternalSymbolizer);
