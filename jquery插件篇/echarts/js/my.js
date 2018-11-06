sensorsdata.UserAnalyticsChart = function(a) {
    if ($.isEmptyObject(a.userObj_) || !$.isArray(a.userObj_.rows) || !$.isArray(a.userObj_.series)) {
        a.container.html(sensorsdata.languages.get("无效的图形数据<!--{en}Invalid graphic data-->"))
    }
    this.option_ = {
        queryData: {},
        container: this.chartsContainer_,
        limit: 10,
        userObj_: this.userObj_,
        widgetModel: false,
        userRollObj_: this.userRollObj_
    };
    $.extend(true, this.option_, a);
    this.chart_ = null;
    this.usedColor_ = {};
    this.dataZoomNum_ = 10;
    this.bucket = ["hour", "day", "week", "month"]
};
sensorsdata.UserAnalyticsChart.prototype.destroy = function() {
    if (this.chart_ && $.isFunction(this.chart_.dispose)) {
        this.chart_.dispose()
    }
    this.option_.container.html("")
};
sensorsdata.UserAnalyticsChart.prototype.resize = function() {
    if (this.chart_ && $.isFunction(this.chart_.resize)) {
        this.chart_.resize()
    }
};
sensorsdata.UserAnalyticsChart.prototype.findColor_ = function(f, d) {
    var b = sensorsdata.CONSTSET.chartsColors;
    if (f[d]) {
        return f[d]
    } else {
        var g = Object.keys(f);
        var c = g.map(function(h) {
            return f[h]
        });
        for (var e = 0,
        a = b.length; e < a; e++) {
            if (c.indexOf(b[e]) === -1) {
                f[d] = b[e];
                return b[e]
            }
        }
    }
};
sensorsdata.UserAnalyticsLineChart = function(a) {
    sensorsdata.UserAnalyticsChart.call(this, a)
};
sensorsdata.inherits(sensorsdata.UserAnalyticsLineChart, sensorsdata.UserAnalyticsChart);
sensorsdata.UserAnalyticsLineChart.prototype.show = function(l) {
    var a = this.option_;
    this.destroy();
    var t = this;
    var m = echarts.init(a.container[0]);
    var d = sensorsdata.echarts;
    var s = a.widgetModel ? 6 : 9;
    var f = a.widgetModel ? 1.4 : 1.6;
    var r = [],
    j = a.userObj_.series.map(function(u) {
        return sensorsdata.trimConstHtml(u)
    }),
    p = [];
    this.names_ = $.isArray(l) ? $.extend(true, [], l) : [];
    var i = a.userObj_.rows.filter(function(u) {
        return t.names_.indexOf(u.name) !== -1
    });
    var h = a.measureUnit[0];
    i.forEach(function(v) {
        var u = [];
        v.data.forEach(function(w) {
            u.push(w[0])
        });
        p.push(u)
    });
    var b = {
        show: !a.widgetModel,
        data: []
    };
    var o = (a.widgetModel && j.length <= 10) || (!a.widgetModel && j.length <= 30);
    i.forEach(function(x, w) {
        var v = sensorsdata.trimConstHtml(x.name);
        b.data.push({
            name: v
        });
        var u = t.findColor_(t.usedColor_, v);
        r.push({
            name: v,
            type: "line",
            showbolSize: !a.widgetModel,
            symbol: "circle",
            symbolSize: s,
            showAllSymbol: o,
            lineStyle: {
                normal: {
                    color: u,
                    width: f
                }
            },
            data: p[w].map(function(z, y) {
                return {
                    value: z,
                    measureUnit: h,
                    xLabel: sensorsdata.trimConstHtml(j[y]),
                    itemStyle: {
                        normal: {
                            color: u
                        }
                    }
                }
            })
        })
    });
    var n = {
        show: false
    };
    if (!a.widgetModel) {
        var g = j.length;
        var q = this.dataZoomNum_;
        if (g > q) {
            n.show = true;
            n.start = 0;
            n.end = 100
        }
    }
    var c = function(v) {
        var u = a.queryData.by_fields.length === 1 ? "": ("</br>" + d.truncateLabel(v.seriesName, 50));
        return v.data.xLabel + u + "：" + v.data.value + v.data.measureUnit
    };
    var e = {
        trigger: "axis",
        axisPointer: {
            lineStyle: {
                width: 0
            }
        },
        formatter: function(u) {
            if ($.isArray(u)) {
                u = u[0]
            }
            return sensorsdata.echarts.wrapTriangleTooltip(c(u))
        },
        position: function(w, v, u) {
            return d.lineTooltipPosition(m, w, v, u, c)
        }
    };
    var k = {
        color: sensorsdata.CONSTSET.chartsColors,
        tooltip: e,
        legend: b,
        dataZoom: n,
        xAxis: {
            data: j
        },
        yAxis: {
            axisLabel: {
                formatter: function(u) {
                    if (a.widgetModel) {
                        return sensorsdata.formatNumber(u, true)
                    } else {
                        return sensorsdata.formatNumber(u, true)
                    }
                }
            }
        },
        series: r
    };
    if (a.widgetModel) {
        k.grid = {
            bottom: 0,
            left: 10
        };
        e.axisPointer = {
            lineStyle: {
                width: 1,
                color: "#aaa"
            }
        };
        e.formatter = function() {
            return ""
        };
        e.backgroundColor = "rgba(50,50,50,0)";
        e.borderWidth = 0;
        delete e.position
    }
    m.on("mouseover",
    function(u) {
        m.dispatchAction({
            type: "highlight",
            seriesIndex: u.seriesIndex
        })
    });
    m.on("mouseout",
    function(u) {
        m.dispatchAction({
            type: "downplay",
            seriesIndex: u.seriesIndex
        })
    });
    m.on("showtip",
    function(w) {
        if ($.isFunction(a.onPointChanged)) {
            var v = m.getModel().getSeriesByIndex(w.seriesIndex).getData();
            var u = v.indexOfRawIndex(w.dataIndex);
            a.onPointChanged(u)
        }
    });
    k = $.extend(true, {},
    sensorsdata.echarts.option, k);
    if (k.dataZoom.show) {
        k.legend.bottom = 40;
        k.grid.bottom = 90
    }
    this.chart_ = m;
    m.setOption(k)
};
sensorsdata.UserAnalyticsLineChart.prototype.remove = function(b) {
    var a = this.names_.indexOf(b);
    if (a >= 0) {
        this.names_.splice(a, 1);
        this.show(this.names_);
        return $.extend(true, [], this.names_)
    }
};
sensorsdata.UserAnalyticsPieChart = function(a) {
    sensorsdata.UserAnalyticsChart.call(this, a);
    this.tplPieContainer_ = $("#tpl-user-analytics-index-pie-container").html()
};
sensorsdata.inherits(sensorsdata.UserAnalyticsPieChart, sensorsdata.UserAnalyticsChart);
sensorsdata.UserAnalyticsPieChart.prototype.show = function(j) {
    var c = this.option_;
    this.destroy();
    var k = this;
    var b = sensorsdata.echarts;
    var a = c.measureName;
    var d = sensorsdata.languages.get("其它...<!--{en}Other...-->");
    var h = echarts.init(c.container[0]);
    this.names_ = $.isArray(j) ? $.extend(true, [], j) : [];
    var g = function(p, n) {
        var o = p.map(function(r) {
            var q = k.findColor_(k.usedColor_, r.name);
            return {
                value: r.data[0],
                name: r.name,
                color: q
            }
        });
        if (p.length < n.length) {
            var m = 0;
            n.map(function(q) {
                if (k.names_.indexOf(q.name) === -1) {
                    m += q.data[0][0]
                }
            });
            o.push({
                name: d,
                value: Math.round(m * 100) / 100,
                color: k.findColor_(k.usedColor_, d)
            })
        }
        return o
    };
    var l = c.userRollObj_.rows.filter(function(m) {
        return k.names_.indexOf(m.name) !== -1
    });
    var i = c.userRollObj_.rows;
    var e = g(l, i);
    var f = {
        color: sensorsdata.CONSTSET.chartsColors,
        selectedOffset: 0,
        label: $.extend(true, {},
        b.legendLabel),
        tooltip: $.extend(true, {},
        b.option.tooltip),
        itemStyle: {
            emphasis: {
                shadowBlur: 10,
                shadowColor: "rgba(0, 0, 0, 0.5)"
            }
        },
        series: [{
            name: a,
            type: "pie",
            selectedOffset: 0,
            radius: ["31%", "55%"],
            label: $.extend(true, {},
            b.legendLabel),
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowColor: "rgba(0, 0, 0, 0.5)"
                }
            },
            data: e
        }]
    };
    f.tooltip.formatter = function(m) {
        return m.seriesName + "</br>" + b.truncateLabel(m.data.name, 50) + "：" + m.value + sensorsdata.languages.get("占<!--{en}take-->") + m.percent + "%"
    };
    f.series[0].label.normal.formatter = function(m) {
        return b.truncateLabel(m.name, c.widgetModel ? 10 : 20) + "\n" + m.percent + "%"
    };
    if (c.widgetModel === true) {
        f.series[0].radius = ["35%", "60%"]
    }
    this.chart_ = h;
    h.setOption(f)
};
sensorsdata.UserAnalyticsPieChart.prototype.remove = function(b) {
    var a = this.names_.indexOf(b);
    if (a >= 0) {
        this.names_.splice(a, 1);
        this.show(this.names_)
    }
    return $.extend(true, [], this.names_)
};
sensorsdata.UserAnalyticsBarChart = function(a) {
    sensorsdata.UserAnalyticsChart.call(this, a)
};
sensorsdata.inherits(sensorsdata.UserAnalyticsBarChart, sensorsdata.UserAnalyticsChart);
sensorsdata.UserAnalyticsBarChart.prototype.show = function(j) {
    var a = this.option_;
    this.destroy();
    var r = this;
    var k = echarts.init(a.container[0]);
    var c = sensorsdata.echarts;
    var q = [];
    var g = a.userObj_.series.map(function(s) {
        return sensorsdata.trimConstHtml(s)
    });
    var m = [];
    this.names_ = $.isArray(j) ? $.extend(true, [], j) : [];
    var f = a.userObj_.rows.filter(function(s) {
        return r.names_.indexOf(s.name) !== -1
    });
    var b = {
        show: !a.widgetModel,
        data: []
    };
    var p = [];
    var e = a.measureUnit[0];
    var o = a.measureName;
    f.forEach(function(t) {
        var s = [];
        t.data.forEach(function(u) {
            s.push(u[0])
        });
        m.push(s)
    });
    g.forEach(function(u, s) {
        var t = 0;
        f.map(function(v) {
            t += v.data[s][0]
        });
        p.push(t)
    });
    f.forEach(function(v, u) {
        var t = sensorsdata.trimConstHtml(v.name);
        b.data.push({
            name: t
        });
        var s = r.findColor_(r.usedColor_, t);
        q.push({
            name: t,
            type: "bar",
            barGap: "10%",
            barMaxWidth: "40%",
            itemStyle: {
                normal: {
                    color: s
                }
            },
            stack: o,
            data: m[u].map(function(x, w) {
                return {
                    value: x,
                    measureUnit: e,
                    xLabel: g[w],
                    totalValue: p[w],
                    measureName: o
                }
            })
        })
    });
    var l = {
        show: false
    };
    if (!a.widgetModel) {
        var h = g.length;
        var n = this.dataZoomNum_;
        if (h > n) {
            l.show = true;
            l.start = 0;
            l.end = 100
        }
    }
    var d = {
        formatter: function(t) {
            var s = a.queryData.by_fields.length === 1 ? "": ("</br>" + c.truncateLabel(t.seriesName, 50));
            return t.data.xLabel + s + "：" + t.data.value + t.data.measureUnit
        }
    };
    if (a.widgetModel) {
        d.trigger = "axis";
        d.axisPointer = {
            lineStyle: {
                width: 1,
                color: "#aaa"
            }
        };
        d.formatter = function() {
            return ""
        };
        d.backgroundColor = "rgba(50,50,50,0)";
        d.borderWidth = 0
    }
    var i = {
        color: sensorsdata.CONSTSET.chartsColors,
        tooltip: d,
        legend: b,
        dataZoom: l,
        xAxis: {
            data: g
        },
        series: q
    };
    if (a.widgetModel === true) {
        i.grid = {
            bottom: 0,
            left: 10
        }
    }
    k.on("showtip",
    function(u) {
        if ($.isFunction(a.onPointChanged)) {
            var t = k.getModel().getSeriesByIndex(u.seriesIndex).getData();
            var s = t.indexOfRawIndex(u.dataIndex);
            a.onPointChanged(s)
        }
    });
    i = $.extend(true, {},
    sensorsdata.echarts.option, i);
    if (i.dataZoom.show) {
        i.legend.bottom = 40;
        i.grid.bottom = 90
    }
    this.chart_ = k;
    k.setOption(i)
};
sensorsdata.UserAnalyticsBarChart.prototype.remove = function(b) {
    var a = this.names_.indexOf(b);
    if (a >= 0) {
        this.names_.splice(a, 1);
        this.show(this.names_, this.measureIndexs_);
        return $.extend(true, [], this.names_)
    }
};