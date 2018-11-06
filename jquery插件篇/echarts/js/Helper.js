;((function($, echarts, undefined) {
	var pluginName = 'echartsHelper', _global, chart;
	// if(typeof echarts === 'undefined') {
	// 	console.log('lcm')
	// 	return ;
	// }
	var defaults = {
		tooltip: {  
            trigger: 'axis',//tooltip触发方式:axis以X轴线触发,item以每一个数据项触发 
   //          formatter:function (params) {
   //          	console.log(JSON.stringify(params)) 
			// },
            // axisPointer: {
            //     show: true,
            //     type: 'cross',
            //     lineStyle: {
            //         type: 'dashed',
            //         width: 1
            //     }
            // },
            // formatter: function(params) {
            //     var value=formatDate(params.value[0])
            //     return params.seriesName + ': [ '+
            //         value + ', ' +
            //         params.value[1] + ' ]';
            // } 
        },
        toolbox: {
	        show : true,
	        feature : {
	            mark : {show: true},
	            dataView : {show: false, readOnly: false}, //数据预览
	            magicType : {show: true, type: ['line', 'bar', 'pie']}, //支持柱形图和折线图的切换 
	            restore : {show: true}, //复原 
	            saveAsImage : {show: true}//是否保存图片  
	        }
    	},
    	grid: {
    		containLabel: false
    	}   
	}
	function EchartsHelper(element, options) {
		console.log(element)
		this.settings = $.extend({}, defaults, options);
		console.log(this.settings);
		this._defaults = defaults;
		this.element = element;
		if (chart != null && chart != "" && chart != undefined) {
			console.log('重新绘制');  
        	chart.dispose();  
    	}
		this.init();
		

		return chart;

	}
	EchartsHelper.prototype.init = function() {
		
    	// myChart.dispose();  
		chart = echarts.init(this.element);
		chart.showLoading({ text : '数据获取中'});
		this.create();
		// chart.setOption(this.settings);
		// return myChart;
		// return myChart;
		// myChart.on('showtip', function(w) {
		// 	console.log(w)
		// 	// alert('lcm');
		// })
	}

	EchartsHelper.prototype.create = function() {
		var that = this;
		if(this.settings.series[0].type === 'pie') {
			
			this.createPie();
		}
		if(this.settings.series[0].type === 'line') {
			
			this.createLines();
		}
		if(this.settings.series[0].type === 'bar') {
			this.createBars()
		}
		// chart.hideLoading();
		// return this;
		
		// mychart.on('mouseover', function (params) {
		//     console.log(params);
		// });

	}

	EchartsHelper.prototype.createLines = function() { //折线图
		var barDefault = {
			xAxis: {
				axisTick: {
                	alignWithLabel: true
            	}
			},
			color: ['#559FF0', '#AACF44', '#FF9945'],
			yAxis: {
				splitLine: { //y轴横着的分割线
		        	show: true,
		        	// lineStyle: {
		        	// 	color: ['#000']
		        	// }
		        },
		        axisLine: {
		        	show: true
		        },
		        axisTick: {
		        	// length: 3,
		        	// lineStyle: {
		        	// 	color: '#000'
		        	// } 
		        },
		        axisLabel: {
		        	show: true,
		        }
			}
		}
		this.settings.series.forEach(function(v) {
			console.log(v)
			v.symbol = v.symbol || 'circle';
			v.symbolSize = v.symbolSize || 6;
		})
				this.settings = $.extend(true, barDefault, this.settings);
		console.log(this.settings)
	}

	EchartsHelper.prototype.createBars = function() { //柱状图
		var barDefault  = {
			xAxis: {
				axisTick: {
                	alignWithLabel: true
            	}
			}
		}
		this.settings = $.extend(true, barDefault, this.settings);			
	}
	EchartsHelper.prototype.createPie = function() { // 饼形图
		console.log('执行')
		var pieDefault = {
			legend: {
				orient: 'vertical',
				left: 'left'
			},
			tooltip: {
				trigger: 'item'
			},
			series: [
				{
					itemStyle: {
		                emphasis: { //高亮区域的样式
		                    shadowBlur: 10,
		                    shadowOffsetX: 0,
		                    shadowColor: 'rgba(0, 0, 0, 0.5)'
		                }
            		},
            		radius : '55%',
            		center: ['50%', '50%']
				}
			]
		}

		this.settings = $.extend(true, pieDefault, this.settings);	
	}

		
		

	// $.fn[pluginName] = function(options) {
	// 	console.log('lcm')
	// 	this.each(function() {
	// 		if (!$.data(this, 'plugin_' + pluginName)) {
	// 			$.data(this, 'plugin_' + pluginName, new EchartsHelper(this, options))
	// 		}
	// 	})
	// 	return this;	
	// }
	_global = (function(){ return this || (0, eval)('this'); }());
    !('EchartsHelper' in _global) && (_global.EchartsHelper = EchartsHelper);
})(jQuery, echarts))


// sensorsdata.echarts.wrapTriangleTooltip = function(a) {
//     return '<div class="sa-echarts-tooltip-triangle"></div><div class="sa-tooltip">' + a + "</div>"
// }

// sensorsdata.echarts.lineTooltipPosition = function(k, e, z, b, q) {
//     var a = null;
//     var j = null;
//     var s = -1;
//     var A = -1;
//     if ($.isArray(z)) {
//         for (var r = 0, t = z.length; r < t; r++) {
//             var B = k.getModel().getSeriesByIndex(z[r].seriesIndex).getData();
//             if (z[r].dataIndex === -1) {
//                 continue
//             }
//             var d = B.indexOfRawIndex(z[r].dataIndex);
//             var f = B.getRawDataItem(d);
//             if (!f || (!$.isNumeric(f) && !$.isNumeric(f.value))) {
//                 continue
//             }
//             var c = B.getItemLayout(d);
//             if (a === null) {
//                 a = c;
//                 j = z[r];
//                 s = z[r].seriesIndex;
//                 A = z[r].dataIndex
//             } else {
//                 if ($.isArray(a) && $.isNumeric(a[1]) && Math.abs(e[1] - c[1]) < Math.abs(e[1] - a[1])) {
//                     a = c;
//                     j = z[r];
//                     s = z[r].seriesIndex;
//                     A = z[r].dataIndex
//                 }
//             }
//         }
//     } else {
//         a = k.getModel().getSeriesByIndex(z.seriesIndex).getData().getItemLayout(z.dataIndex);
//         j = z
//     }
//     if (!$.isArray(a)) {
//         return e
//     }
//     var n = q(j);
//     var o = $(b);
//     o.find(".sa-tooltip").html(n);
//     var m = $(k.getDom());
//     var w = m.width();
//     var v = m.height();
//     var u = o.width();
//     var l = o.height();
//     var h = a[0] - u / 2;
//     var g = a[1] + 10;
//     var p = "top";
//     if ((g + l) >= v) {
//         g = a[1] - 10 - l;
//         p = "bottom"
//     }
//     if (h <= 0) {
//         g = a[1] - l / 2 - 5;
//         h = a[0] + 20;
//         p = "left"
//     } else {
//         if ((h + u) > w) {
//             h = a[0] - u - 10;
//             g = a[1] - l / 2 - 5;
//             p = "right"
//         }
//     }
//     o.find(".sa-echarts-tooltip-triangle").removeClass("top right bottom left").addClass(p);
//     return [h, g]
// }


// sensorsdata.echarts.createLineLegendIcon = function(e, c) {
//     var a = sensorsdata.echarts.option.legend.itemWidth;
//     var i = sensorsdata.echarts.option.legend.itemHeight;
//     var d = a;
//     var h = 2;
//     var b = 0;
//     var g = $('<canvas width="' + a + '" height="' + i + '">');
//     var j = g[0].getContext("2d");
//     j.fillStyle = "rgba(0,0,0,0)";
//     j.fillRect(0, 0, a, i);
//     switch (e) {
//     case "solid":
//         j.fillStyle = c;
//         j.fillRect(b, (i - h) / 2, d, h);
//         break;
//     case "dashed":
//         for (b = 0; b <= (d - 4); b += 6) {
//             j.fillStyle = c;
//             j.fillRect(b, (i - h) / 2, 4, h)
//         }
//         break;
//     case "dotted":
//         for (b = 0; b <= (d - 1); b += 3) {
//             j.fillStyle = c;
//             j.fillRect(b, (i - h) / 2, 1, h)
//         }
//         break
//     }
//     var f = g[0].toDataURL("image/png");
//     g.remove();
//     return "image://" + f
// }