
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
        this.symbolizer["pointRadius"] = 5;
        
        this.defaultUrl = 'http://chart?chf=bg,s,FFFFFF00&cht=p';
        var externalGraphic = this.symbolizer["externalGraphic"];
        var cht = ''; 
        var chd = ''; 
        var chf = ''; 
        var chco = ''; 
        if(externalGraphic !== undefined && externalGraphic !== null && externalGraphic !== ''){
            cht = this.getParameterByName('cht',externalGraphic);
            chd = this.getParameterByName('chd',externalGraphic);
            chd = chd.replace('t:','');
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
                        value = 't:'+value;
                        var urlField = this.urlField.getValue();
                        if(urlField !== undefined && urlField !== null && urlField !== ''){
                            this.defaultUrl = urlField;
                        }
                        var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'chd', value);
                        if (!Ext.isEmpty(urlValue)) {
                            this.symbolizer["externalGraphic"] = urlValue;
                        }
                        var chd = this.getParameterByName('chd',urlValue);
                        if(chd !== undefined && chd !== null && chd !== ''){
                            this.urlField.setValue(urlValue);
                            this.fireEvent("change", this.symbolizer);
                        }
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
                    var urlField = this.urlField.getValue();
                    if(urlField !== undefined && urlField !== null && urlField !== ''){
                        this.defaultUrl = urlField;
                    }
                    var urlValue = this.updateQueryStringParameter(this.defaultUrl, 'chco', value);
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
                value: 10,
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
    }
});

/** api: xtype = gxp_pointexternalsymbolizer */
Ext.reg('gxp_pointexternalsymbolizer', gxp.PointExternalSymbolizer);
