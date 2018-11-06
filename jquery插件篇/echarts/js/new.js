sensorsdata.IndexPage = function() {
    this.sideBar_ = $("#sa_sidebar");
    this.saMainDom_ = $("#sa-main");
    this.loadingBar_ = $("#sa-loading-bar");
    this.$headNav_ = $("nav.sa-head");
    this.urlRememberObj = {};
    this.events_ = [];
    this.bookmarkList_ = null;
    this.licenseFreshIntervalId = -1;
    this.licenseItems_ = [];
    this.config_ = {};
    this.aboutModal_ = null;
    this.dashControl_ = null;
    this.dashboardTemplateList_ = [];
    this.search_ = window.location.search;
    this.isEmail_ = this.search_.indexOf("f=email") >= 0;
    this.init()
}
;
sensorsdata.IndexPage.prototype.init = function() {
    window.eventCenter.trigger("IndexPage:initStart", this);
    var i = sensorsdata.getLocationSearch();
    var g = this.getCurrentProject_(i.project || "");
    if (!g) {
        if (i.oauth_type === "oauth") {
            sensorsdata.oAuth(sensorsdata.bind(this.init, this));
            return false
        } else {
            window.location.href = sensorsdata.buildLoginUrl(true, i.project);
            return false
        }
    }
    if (this.isEmail_ && i.base_time && $.isNumeric(i.base_time)) {
        moment.fixedUnixTimestamp = parseInt(i.base_time)
    }
    i.project = g.project;
    this.search_ = "?" + $.param(i);
    sensorsdata.cache.project = {
        id: 0,
        name: g.project,
        cname: ""
    };
    if (g && g.userName) {
        sensorsdata.authority = new sensorsdata.Authority(g)
    } else {
        if (i.oauth_type !== "oauth") {
            window.location.href = sensorsdata.buildLoginUrl();
            return false
        }
    }
    this.$headNav_.find(".username span:last-child").text(sensorsdata.authority.userName);
    if (window.location.host.indexOf("demo.cloud.sensorsdata.cn") > 0) {
        $.cookie("sensorsdata-username", sensorsdata.authority.userName, {
            path: "/",
            expires: 365
        })
    }
    var a = $("[data-authorization]");
    a.filter('[data-authorization="normal"]').show();
    a.filter('[data-authorization!="normal"]').toggle(!sensorsdata.authority.isNormal);
    a.filter('[data-authorization="admin"]').toggle(sensorsdata.authority.isAdmin);
    if (g.project) {
        this.sideBar_.find("a#hue-query").attr("href", "/query/?project=" + g.project)
    }
    var e = sensorsdata.localStorage.getItem(sensorsdata.CONSTSET.urlRememberKey);
    if (e) {
        this.urlRememberObj = JSON.parse(e) || {}
    }
    var d = this;
    this.licenseFreshIntervalId = window.setInterval(function() {
        d.getConfig_(sensorsdata.bind(d.checkLicense_, d))
    }, 10 * 60 * 1000);
    this.initEvent_();
    this.getConfig_().then(function() {
        return d.getProject_(g.project)
    }).then(function() {
        return sensorsdata.dashboardsNav.init()
    }).done(function() {
        d.setDefaultUrl_();
        d.initCEIP_();
        d.initPage();
        d.checkLicense_()
    });
    if (this.sideBar_.width() < 50) {
        this.sideBar_.find("a[title]").tooltip({
            container: "body",
            placement: "right"
        })
    }
    var c = sensorsdata.localStorage.getItem(sensorsdata.CONSTSET.indexPageSidebarStatus);
    c = JSON.parse(c) || {};
    for (var h in c) {
        var b = this.sideBar_.find('h4[data-category="' + h + '"]');
        var f = c[h] === "expand";
        b.find(".action-onoff span").toggleClass("icon-collapse-up", f).toggleClass("icon-expand-down", !f);
        b.next().toggle(f)
    }
    this.bookmarkList_ = new sensorsdata.BookMarkList(sensorsdata.bind(this.initPage, this));
    if ($.isArray(sensorsdata.theme.modules)) {
        sensorsdata.theme.modules.map(function(j) {
            $(j.selector).toggle(j.display)
        })
    }
    if ($.isArray(sensorsdata.theme.moduleReplacements)) {
        sensorsdata.theme.moduleReplacements.map(function(j) {
            $(j.selector).attr(j.attribute, j.value)
        })
    }
    if (!this.isEmail_) {
        new sensorsdata.DemoDataImport()
    } else {
        $("body").addClass("sa-email")
    }
    window.eventCenter.trigger("IndexPage:initEnd", this)
}
;
sensorsdata.IndexPage.prototype.getCurrentProject_ = function(a) {
    var b = [];
    if (!this.isEmail_) {
        b = JSON.parse(sensorsdata.localStorage.getItem(sensorsdata.CONSTSET.projectKey)) || []
    }
    if (b.length === 0) {
        sensorsdata.ajax({
            url: "account/my?project=" + a,
            async: false,
            showLoader: false,
            success: function(d) {
                if (!$.isEmptyObject(d)) {
                    b.push({
                        project: a,
                        userId: d.user_id,
                        userName: d.username,
                        role: d.role,
                        eventPermission: d.event_permission
                    })
                }
            }
        })
    }
    var c = null;
    if (a) {
        c = b.filter(function(d) {
            return (d.project || "default") === a
        })[0];
        if (!c) {
            return c
        }
    }
    if (!c) {
        c = b.filter(function(d) {
            return d.active === true
        })[0]
    }
    if (!c) {
        c = b.filter(function(d) {
            return !d.project || d.project === "default"
        })[0]
    }
    if (!c) {
        c = b[0]
    }
    if (!$.isEmptyObject(c)) {
        c.project = c.project || "default";
        b.map(function(d) {
            d.active = d.project === c.project
        });
        sensorsdata.localStorage.setItem(sensorsdata.CONSTSET.projectKey, JSON.stringify(b))
    }
    return c
}
;
sensorsdata.IndexPage.prototype.initEvent_ = function() {
    window.eventCenter.trigger("IndexPage:initEventStart", this);
    $("#queryChannel").find('a[data-method="copy-channel"]').on("click", function() {
        var b = $(this).attr("data-index");
        var c = '#queryChannel a[data-method="copy-channel"][data-index="' + b + '"]';
        var d = new Clipboard(c,{
            container: document.getElementById("queryChannel")
        });
        d.on("success", function() {
            $(c).hide();
            $('span[data-method="copy-success"]').show()
        })
    });
    $("#queryChannel").find(".changeOk").on("click", sensorsdata.bind(this.queryChannel_, this));
    this.$headNav_.find("#signout").on("click", sensorsdata.bind(this.signoutClick_, this));
    this.sideBar_.on("click", ".sidebar-links li[data-nav], #dashboardsNav li[data-nav]", sensorsdata.bind(this.sidebarLinksClick_, this));
    $(".sa-sidebar-scroll-wrap").scrollUnique();
    var a = this;
    this.sideBar_.find("a#hue-query").on("click", function() {
        sensorsdata.track("custom_query")
    });
    $("#events_management_btn").on("click", function() {
        if ($("#sidebar-toggle").is(":visible")) {
            a.sideBar_.removeClass("shown")
        }
        a.sideBar_.find(".sidebar-section li.active").removeClass("active");
        $("#sidebar-bottom a.active").removeClass("active");
        $(this).addClass("active");
        if (window.pageName !== "/events/") {
            a.initPage("/events/#type=meta")
        }
    });
    $("#vtrack_manager_btn").on("click", function() {
        if ($("#sidebar-toggle").is(":visible")) {
            a.sideBar_.removeClass("shown")
        }
        a.sideBar_.find(".sidebar-section li.active").removeClass("active");
        $("#sidebar-bottom a.active").removeClass("active");
        var b = $(this).addClass("active").attr("data-href");
        if (window.pageName !== b) {
            a.initPage(b)
        }
    });
    $("#bookmark_list_btn").on("click", function() {
        a.sideBar_.find(".sidebar-section li.active").removeClass("active");
        $("#sidebar-bottom a.active").removeClass("active");
        $(this).addClass("active")
    });
    $("#sidebar-toggle").on("click", function() {
        a.sideBar_.find("a[title]").tooltip("destroy");
        if (a.sideBar_.hasClass("shown")) {
            a.sideBar_.removeClass("shown")
        } else {
            a.sideBar_.addClass("shown")
        }
    });
    $("#user-dropdown li a").on("click", function() {
        var d = $(this);
        if (d.attr("data-nav")) {
            a.initPage(d.attr("data-nav"));
            a.sideBar_.find("li.active,a.active").removeClass("active");
            return
        }
        var i = d.attr("data-method");
        switch (i) {
        case "push-manage":
            a.popPushManagement_();
            break;
        case "change-pwd":
            a.popChangePass_();
            break;
        case "sa-share":
            var g = {
                utm_campaign: sensorsdata.cache.config.license.customer_id,
                utm_medium: sensorsdata.cache.project.name,
                utm_source: sensorsdata.authority.userName
            };
            d.attr("href", "https://www.sensorsdata.cn/share/share.html?" + $.param(g));
            break;
        case "diagnosis-tool":
            var f = d.attr("href");
            if (f.indexOf("{{project}}") > -1) {
                d.attr("href", f.replace("{{project}}", sensorsdata.cache.project.name))
            }
            break;
        case "query-channel-tool":
            a.popQueryChannel_();
            break;
        case "build-channel-link":
            var b = "";
            var c = "";
            sensorsdata.ajax({
                url: "common/import/config",
                async: false,
                data: {
                    url: location.href
                },
                showLoader: false,
                success: function(j) {
                    j = j || {};
                    b = j.https_data_url || j.http_data_url;
                    b = b || "";
                    c = b + "sa?project=" + (sensorsdata.cache.project.name || "default");
                    if (j.super_token) {
                        c = c + "&token=" + j.super_token
                    }
                }
            });
            if (!b) {
                sensorsdata.info.show(sensorsdata.languages.get("获取数据接收地址失败，请联系值班同学"));
                return false
            }
            var h = {
                project: sensorsdata.cache.project.name || "default",
                web_url: location.protocol + "//" + location.host,
                server_url: b,
                receive_url: c
            };
            var e = location.protocol + "//www.sensorsdata.cn/tools/short_url_create.html?" + encodeURIComponent(JSON.stringify(h));
            d.attr("href", e);
            break
        }
    });
    $("#sa_head_about").on("click", sensorsdata.bind(this.popAbout_, this));
    $("#btn-viewport-warning-close").on("click", function() {
        $(this).parents("div.viewport-warning:first").hide()
    });
    $(window).off("hashchange.index-page").on("hashchange.index-page", sensorsdata.bind(function() {
        this.rememberUrl_()
    }, this));
    $(window).off("popstate").on("popstate", sensorsdata.bind(function() {
        if (a.isEmail_) {
            return
        }
        if (window.pageName && window.pageName !== window.location.pathname) {
            this.initPage()
        } else {
            if (window.page && $.isFunction(window.page.reload)) {
                if (this.setSideActive_()) {
                    window.page.reload()
                } else {
                    this.setDefaultUrl_();
                    this.initPage()
                }
            }
        }
    }, this));
    $(window).off("unload").on("unload", sensorsdata.bind(function() {
        this.rememberUrl_();
        sensorsdata.clearReportAjax();
        window.clearInterval(this.licenseFreshIntervalId);
        if (window.page && $.isFunction(window.page.unload)) {
            window.page.unload()
        }
    }, this));
    this.sideBar_.on("click", "h4[data-category] .action-onoff", function(c) {
        var f = $(c.target || c.srcElement).closest("button");
        if (f.hasClass("sa-sidebar-dashboard-add")) {
            return
        }
        var e = $(this).parent();
        var b = e.find(".action-onoff span");
        b.toggleClass("icon-collapse-up").toggleClass("icon-expand-down");
        e.next().toggle(b.hasClass("icon-collapse-up"));
        var d = {};
        a.sideBar_.find("h4[data-category]").each(function() {
            d[e.attr("data-category")] = e.find(".action-onoff span").hasClass("icon-collapse-up") ? "expand" : "collapse"
        });
        sensorsdata.localStorage.setItem(sensorsdata.CONSTSET.indexPageSidebarStatus, JSON.stringify(d));
        return false
    })
}
;
sensorsdata.IndexPage.prototype.popPushManagement_ = function() {
    var m = $(Mustache.render($("#tpl-common-modal").html(), {
        title: sensorsdata.languages.get("推送管理<!--{en}Push manage-->"),
        content: $("#tpl-push-management").html()
    })).modal("show").on("hidden.bs.modal", function() {
        m.remove()
    });
    m.find(".form-hold-place").show().next().hide();
    sensorsdata.form.removeChildrenError(m);
    var f = m.find(".push-item-list ul").html("");
    var k = m.find("#btn-ok");
    var g = m.find("#cname").val("");
    var d = m.find("#appKey").val("");
    var l = m.find("#appSecretKey").val("");
    var h = m.find("#pushId").val("");
    var c = m.find("#push-service").saDropdown({
        onSelected: function(o) {
            d.parent().toggle(o !== "2")
        }
    });
    var a = {};
    var n = function() {
        if (!m.find("form").is(":visible") || !sensorsdata.form.checkChildren(m.find("form"), true, 1, {
            container: m
        })) {
            return {}
        }
        var q = sensorsdata.cache.appPushConfigs;
        for (var p = 0, o = q.length; p < o; p++) {
            if (a.id !== q[p].id && q[p].cname === g.val()) {
                sensorsdata.form.addError(g, sensorsdata.languages.get("配置名称重复<!--{en}Configuration name is repeated-->"), true, {
                    container: m
                });
                return {}
            }
        }
        return {
            project_id: sensorsdata.cache.project.id,
            push_service: parseInt(c.attr("data-value"), 10),
            cname: g.val(),
            app_key: d.val(),
            app_secret_key: l.val(),
            profile_of_push_id: h.val()
        }
    };
    var e = function(o) {
        a = o;
        m.find(".form-hold-place").hide().next().show();
        f.find("li.selected").removeClass("selected");
        f.find('li[data-value="' + (o.id || -1) + '"]').addClass("selected");
        c.data("saDropdown").select(o.push_service || "");
        g.val(o.cname || "");
        d.val(o.app_key || "");
        l.val(o.app_secret_key || "");
        h.val(o.profile_of_push_id || "");
        d.parent().toggle(c.find("span.selected").attr("data-value") !== "2")
    };
    var b = function(o, p) {
        return sensorsdata.ajax({
            url: "app_push_config" + (o.id ? ("/" + o.id) : ""),
            method: "POST",
            data: JSON.stringify(o),
            success: function(s) {
                if (!o.id) {
                    o.id = s.id;
                    sensorsdata.cache.appPushConfigs.push(o);
                    f.find("li.selected").attr("data-value", s.id).text(o.cname)
                } else {
                    for (var r = 0, q = sensorsdata.cache.appPushConfigs.length; r < q; r++) {
                        if (sensorsdata.cache.appPushConfigs[r].id === o.id) {
                            sensorsdata.cache.appPushConfigs[r] = o
                        }
                    }
                }
                if (p) {
                    m.modal("hide")
                }
            }
        })
    };
    sensorsdata.ajax({
        url: "app_push_config",
        showLoader: false,
        success: function(p) {
            if ($.isArray(p) && p.length > 0) {
                sensorsdata.cache.appPushConfigs = p;
                var o = "";
                p.map(function(q) {
                    o += '<li data-value="' + q.id + '">' + q.cname + "</li>"
                });
                f.html(o);
                e(p[0])
            } else {
                sensorsdata.cache.appPushConfigs = []
            }
        }
    });
    m.find('form input[type="text"]').off("keyup").on("keyup", function() {
        if ($(this).val()) {
            sensorsdata.form.removeError($(this))
        }
    });
    f.off("click").on("click", function(o) {
        var q = $(o.target || o.srcElement);
        var p = parseInt(q.attr("data-value"), 10);
        if (p > 0) {
            a = sensorsdata.cache.appPushConfigs.filter(function(r) {
                return r.id === p
            })[0];
            e(a);
            sensorsdata.form.removeChildrenError(m)
        } else {
            e({
                cname: sensorsdata.languages.get("新建配置<!--{en}Add new configuration-->")
            })
        }
    });
    m.find("span.icon-new").off("click").on("click", function() {
        if (!a.id && f.find("li.selected").length === 0) {
            m.find(".form-hold-place").hide().next().show();
            f.find("li.selected").removeClass("selected");
            f.append('<li class="selected" data-value="-1">新建配置</li>');
            g.val(sensorsdata.languages.get("新建配置<!--{en}Add new configuration-->"));
            return
        }
        var o = n();
        if ($.isEmptyObject(o)) {
            return
        }
        $.extend(true, a, o);
        b(a).then(function() {
            g.val("");
            d.val("");
            l.val("");
            h.val("");
            f.find("li.selected").text(a.cname).removeClass("selected");
            f.append('<li class="selected" data-value="-1">新建配置</li>');
            g.val(sensorsdata.languages.get("新建配置<!--{en}Add new configuration-->"));
            a = {};
            sensorsdata.form.removeChildrenError(m)
        })
    });
    m.find("span.icon-delete").off("click").on("click", function() {
        sensorsdata.form.removeChildrenError(m);
        if (!a.id) {
            f.find("li.selected").remove();
            if (sensorsdata.cache.appPushConfigs.length === 0) {
                m.find(".form-hold-place").show().next().hide()
            } else {
                e(sensorsdata.cache.appPushConfigs[0])
            }
            return
        }
        sensorsdata.ajax({
            url: "app_push_config/" + a.id,
            method: "DELETE",
            success: function() {
                f.find('li[data-value="' + a.id + '"]').remove();
                g.val("");
                d.val("");
                l.val("");
                h.val("");
                for (var p = 0, o = sensorsdata.cache.appPushConfigs.length; p < o; p++) {
                    if (sensorsdata.cache.appPushConfigs[p].id === a.id) {
                        sensorsdata.cache.appPushConfigs.splice(p, 1);
                        break
                    }
                }
                a = {};
                if (sensorsdata.cache.appPushConfigs.length === 0) {
                    m.find(".form-hold-place").show().next().hide()
                } else {
                    e(sensorsdata.cache.appPushConfigs[0])
                }
            }
        })
    });
    var i = m.find('input[data-method="connect-param"]');
    var j = function() {
        var o = true;
        i.filter(":visible").each(function() {
            if (!$.trim($(this).val())) {
                o = false
            }
        })
    };
    i.off("keyup").on("keyup", j).off("focusout").on("focusout", j);
    k.unbind("click").bind("click", function() {
        if (f.find("li.selected").length === 0) {
            m.modal("hide")
        }
        var o = n();
        if ($.isEmptyObject(o)) {
            return
        }
        $.extend(true, a, o);
        b(a, true)
    })
}
;
sensorsdata.IndexPage.prototype.popChangePass_ = function() {
    var g = $("#changePassword");
    var e = g.find("#changeOk");
    var c = g.find(".close");
    g.modal("show");
    var d = $("#newPass")
      , h = $("#renewPass")
      , f = $("#oldPass");
    var b = function() {
        f.val("");
        d.val("");
        h.val("")
    };
    var a = function(j) {
        var i = sensorsdata.form.checkChildren(j, true, 0, {
            container: g
        });
        if (!i) {
            return false
        } else {
            var k = $.trim(h.val());
            var l = $.trim(d.val());
            if (k !== l) {
                sensorsdata.form.addError(d, d.attr("data-error-text-re"), false, {
                    container: g
                });
                sensorsdata.form.addError(h, h.attr("data-error-text-re"), true, {
                    container: g
                });
                return false
            } else {
                sensorsdata.form.removeError(j);
                return true
            }
        }
    };
    d.on("focusout", function() {
        sensorsdata.form.check($(this), true, 1, {
            container: g
        })
    });
    h.on("focusout", function() {
        sensorsdata.form.check($(this), true, 1, {
            container: g
        })
    });
    c.on("click", function() {
        b();
        sensorsdata.form.removeError(f);
        sensorsdata.form.removeError(d);
        sensorsdata.form.removeError(h)
    });
    e.click(function() {
        if (a(g) === false) {
            return
        }
        var i = {
            password: $.trim(d.val()),
            old_password: $.trim(f.val())
        };
        sensorsdata.ajax({
            type: "post",
            url: "account/password",
            data: JSON.stringify(i),
            customErrorStatusCode: 403,
            error: function(j) {
                b();
                if (j.status === 403) {
                    sensorsdata.form.addError(f, f.attr("data-error-text"), true, {
                        container: g
                    })
                }
                if (j.status === 400) {
                    sensorsdata.form.addError(f, f.attr("data-error-text-test1"), true, {
                        container: g
                    })
                }
            },
            success: function() {
                sensorsdata.form.removeError(f);
                g.modal("hide");
                b();
                var j = sensorsdata.buildLoginUrl();
                var k = '修改密码成功，请<a href="' + j + '">重新登录</a>';
                window.setTimeout(function() {
                    window.location.href = j
                }, 3000);
                sensorsdata.info.show(k)
            }
        })
    })
}
;
sensorsdata.IndexPage.prototype.beautifyJSON_ = function(c, b) {
    var a = {
        dom: c,
        imgCollapsed: "/res/img/Collapsed.gif",
        imgExpanded: "/res/img/Expanded.gif",
        isCollapsible: false
    };
    var d = new JsonFormater(a);
    d.doFormat(b)
}
;
sensorsdata.IndexPage.prototype.popQueryChannel_ = function() {
    var a = $("#queryChannel");
    a.find(".tip, .result-content").hide();
    a.find("input[type=text]").val("");
    a.find("a[data-method=copy-channel]").show();
    a.modal("show")
}
;
sensorsdata.IndexPage.prototype.queryChannel_ = function() {
    var c = this;
    var b = $("#queryChannel");
    var e = $.trim(b.find(".ip").val())
      , a = $.trim(b.find(".devices").val());
    var d = [];
    if (!e && !a) {
        sensorsdata.info.show('"测试设备 IP "和"测试设备号"至少要输入一个才能查询');
        return
    }
    if (e) {
        d.push(e)
    }
    if (a) {
        d.push(a)
    }
    sensorsdata.ajax({
        type: "post",
        url: "track_installation/query",
        data: JSON.stringify(d),
        customErrorStatusCode: 403,
        success: function(i) {
            var f = i.is_all || false
              , k = i.data || [];
            if (!f) {
                b.find(".tip").show()
            } else {
                b.find(".tip").hide()
            }
            var j = b.find(".result-json")[0];
            c.beautifyJSON_(j, k);
            b.find('span[data-method="copy-success"]').hide();
            var h = b.find("a[data-method=copy-channel]");
            var g = h.attr("data-index") || 0;
            h.attr("data-index", ++g).show();
            b.find(".result-content").show()
        }
    })
}
;
sensorsdata.IndexPage.prototype.popAbout_ = function() {
    var b = function(j) {
        var m = Mustache.render($("#tpl-common-modal").html(), {
            title: sensorsdata.languages.get("正在重置“<!--{en}is resetting“-->") + j + sensorsdata.languages.get("”，请勿关闭网页<!--{en}”，Please don't close the page-->"),
            closeButtonText: sensorsdata.languages.get("关闭<!--{en}Close-->")
        });
        var l = $(m);
        l.find(".modal-dialog").addClass("modal-lg");
        l.find(".modal-body").html($("#tpl-reset-project-progress").html());
        var h = l.find(".modal-body .progress-bar");
        var o = 40;
        var n = 0;
        var i = function() {
            var p = 0;
            n = setInterval(function() {
                if (p > 40) {
                    clearInterval(n);
                    return
                }
                var q = Math.round(p / o * 100) + "%";
                h.css("width", q).text(q);
                p += 0.5
            }, 500)
        };
        l.modal({
            backdrop: "static",
            keyboard: false,
            show: true
        });
        i();
        $(window).bind("beforeunload.reset-project", function() {
            return confirm(sensorsdata.languages.get("确定关闭浏览器吗？重置会发生意想不到的结果。<!--{en}Are you sure you want to close the browser?Reset will result in unexpected results.-->"))
        });
        var k = sensorsdata.cache.project.name;
        sensorsdata.ajax({
            method: "PUT",
            url: "project/" + (k || "default"),
            customErrorStatusCode: 422,
            timeout: 40000,
            complete: function() {
                $(window).unbind("beforeunload.reset-project");
                clearInterval(n);
                h.css("width", "100%").text("100%")
            },
            error: function(q) {
                var p = parseInt(q.status, 10);
                l.find(".alert").toggle(p === 422);
                l.find("#btn-cancel").show()
            },
            success: sensorsdata.bind(function() {
                window.location.href = sensorsdata.buildLoginUrl(false)
            }, this)
        })
    };
    var e = Mustache.render($("#tpl-common-modal").html(), {
        title: sensorsdata.languages.get("关于<!--{en}About-->"),
        closeButtonText: sensorsdata.languages.get("关闭<!--{en}Close-->"),
        okButtonHide: true
    });
    var g = moment(sensorsdata.cache.config.build_time);
    var d = moment(this.config_.build_time);
    var c = $(e);
    var a = Mustache.render($("#tpl-sa-about").html(), {
        buildVersion: sensorsdata.cache.config.build_version,
        buildTime: sensorsdata.cache.config.build_time,
        isExpire: g.isValid() && d.isValid() && g.isAfter(d),
        project: sensorsdata.cache.project.cname || sensorsdata.cache.project.name,
        licenseItems: this.licenseItems_,
        denyReset: sensorsdata.authority.userName !== "admin"
    });
    var f = this;
    c.find(".modal-body").html(a).find("#btn-reset-project").unbind("click").bind("click", function() {
        f.aboutModal_.modal("hide");
        var j = Mustache.render($("#tpl-common-modal").html(), {
            title: sensorsdata.languages.get("信息确认<!--{en}Information validation-->"),
            defaultCloseHide: true
        });
        var i = $(j);
        i.find(".modal-body").html($("#tpl-reset-project-confirm").html());
        var h = i.find("#btn-ok");
        h.toggleClass("disabled", true);
        i.find("#confirm-checkbox").unbind("change").bind("change", function() {
            h.toggleClass("disabled", !$(this).prop("checked"))
        });
        h.unbind("click").bind("click", function() {
            if (!sensorsdata.form.checkChildren(i, true, 1, {
                container: i
            })) {
                return
            }
            var n = i.find("#project-name");
            var l = $.trim(n.val());
            var m = $.trim(i.find("#reset-reason").val());
            if ((sensorsdata.cache.project.name && l !== sensorsdata.cache.project.cname) || (!sensorsdata.cache.project.name && l !== sensorsdata.languages.get("默认项目<!--{en}default project-->"))) {
                sensorsdata.form.addError(n, sensorsdata.languages.get("项目名称不正确<!--{en}The project name is incorrect-->"), true, {
                    container: i
                });
                return
            }
            var k = new Image();
            k.src = "/err.gif?method=reset-project&project=" + encodeURIComponent(l) + "&reason=" + encodeURIComponent(m);
            i.modal("hide");
            b(l)
        });
        i.modal("show")
    });
    if (this.aboutModal_) {
        this.aboutModal_.modal("hide")
    }
    this.aboutModal_ = c.modal("show")
}
;
sensorsdata.IndexPage.prototype.rememberUrl_ = function() {
    var a = window.location.pathname;
    var b = window.location.hash;
    if (b.indexOf(sensorsdata.CONSTSET.bookmarkId) !== -1) {
        return
    }
    if (!this.checkUrl_(a)) {
        return
    }
    if (sensorsdata.cache.errors[a + b]) {
        delete this.urlRememberObj[a]
    } else {
        this.urlRememberObj[a] = b;
        this.urlRememberObj.lastPathname = a
    }
    sensorsdata.localStorage.setItem(sensorsdata.CONSTSET.urlRememberKey, JSON.stringify(this.urlRememberObj))
}
;
sensorsdata.IndexPage.prototype.sidebarLinksClick_ = function(a) {
    if ($("#sidebar-toggle").is(":visible")) {
        this.sideBar_.removeClass("shown")
    }
    var b = $(a.target || a.srcElement);
    var c = b.attr("data-nav");
    if (!c) {
        b = b.parents("li:first");
        c = b.attr("data-nav")
    }
    $("#sidebar-bottom a.active").removeClass("active");
    this.initPage(b.find("a").attr("data-href"))
}
;
sensorsdata.IndexPage.prototype.signoutClick_ = function() {
    sensorsdata.ajax({
        method: "POST",
        url: "auth/logout",
        success: sensorsdata.bind(function() {
            window.location.href = sensorsdata.buildLoginUrl(false)
        }, this),
        error: sensorsdata.bind(function(a) {
            if (parseInt(a.status, 10) === 503) {
                sensorsdata.cache.project = {};
                window.location.href = sensorsdata.buildLoginUrl(false)
            }
        }, this)
    })
}
;
sensorsdata.IndexPage.prototype.refresh = function() {
    var a = window.location.pathname + window.location.search + window.location.hash;
    this.initPage(a)
}
;
sensorsdata.IndexPage.prototype.initCEIP_ = function() {
    if (sensorsdata.cache.config.customer_experience_improvement_program !== true) {
        return
    }
    (function(o) {
        var c = o.sdk_url
          , e = o.name
          , l = window
          , h = document
          , m = "script"
          , k = null
          , j = null;
        l.sensorsDataAnalytic201505 = e;
        l[e] = l[e] || function(d) {
            return function() {
                (l[e]._q = l[e]._q || []).push([d, arguments])
            }
        }
        ;
        var f = ["track", "quick", "register", "registerPage", "registerOnce", "registerSession", "registerSessionOnce", "trackSignup", "trackAbtest", "setProfile", "setOnceProfile", "appendProfile", "incrementProfile", "deleteProfile", "unsetProfile", "identify", "login", "logout"];
        for (var g = 0; g < f.length; g++) {
            l[e][f[g]] = l[e].call(null, f[g])
        }
        if (!l[e]._t) {
            k = h.createElement(m);
            j = h.getElementsByTagName(m)[0];
            k.async = 1;
            k.src = c;
            j.parentNode.insertBefore(k, j);
            l[e].para = o
        }
    }
    )({
        sdk_url: "https://static.sensorsdata.cn/sdk/1.6.21/sensorsdata.min.js",
        name: "saCEIP",
        server_url: "https://sa.cloud.sensorsdata.cn:4006/sa?token=2b881680023a0e5b&project=production",
        show_log: false,
        cross_subdomain: false
    });
    var a = sensorsdata.cache.config.license || {};
    saCEIP.identify(a.customer_id + ":" + sensorsdata.authority.userId);
    saCEIP.setOnceProfile({
        first_login_time: moment().format(sensorsdata.CONSTSET.timeFormat)
    });
    saCEIP.register({
        customer_id: a.customer_id,
        project_name: sensorsdata.cache.project.name || "default"
    });
    var b = {
        role: sensorsdata.authority.roleName,
        customer_id: a.customer_id,
        user_name: sensorsdata.authority.userName,
        install_time: a.install_time,
        expire_time: a.expire_time,
        project_id: sensorsdata.cache.project.id,
        project_name: sensorsdata.cache.project.name || "default",
        project_cname: sensorsdata.cache.project.cname,
        last_login_time: moment().format(sensorsdata.CONSTSET.timeFormat)
    };
    sensorsdata.ajax({
        showLoader: false,
        url: "events/all?cache=false&invisible=true",
        complete: function(d) {
            var c = new Date(d.getResponseHeader("Date"))
              , e = c.getTime() + (c.getTimezoneOffset() * 1000 * 60) + 8 * 60 * 60 * 1000;
            b.last_login_time = moment(e).format(sensorsdata.CONSTSET.timeFormat)
        },
        success: function(c) {
            b.import_event_num = c.length
        }
    }).then(function() {
        return sensorsdata.ajax({
            showLoader: false,
            url: "property/all",
            success: function(e) {
                var f = sensorsdata.cache.eventPropertiesMap = {};
                for (var d = 0, c = e.length; d < c; d++) {
                    f[e[d].name] = e[d]
                }
                b.import_event_property_num = e.length
            }
        })
    }).then(function() {
        sensorsdata.ajax({
            showLoader: false,
            url: "property/user/properties",
            success: function(f) {
                var d = sensorsdata.cache.userPropertiesMap = {};
                for (var e = 0, c = f.length; e < c; e++) {
                    d[f[e].name] = f[e]
                }
                b.import_user_property_num = f.length;
                saCEIP.setProfile(b)
            }
        })
    })
}
;
sensorsdata.IndexPage.prototype.setSideActive_ = function(b, c) {
    b = b || window.location.pathname;
    c = c || window.location.hash;
    var a = null;
    if (b === "/dashboard/") {
        var e = sensorsdata.unparam(c).dashid;
        a = this.sideBar_.find('[data-nav="/dashboard/#dashid=' + e + '"]')
    } else {
        var d = (/^\/(\S+?)\//).exec(b);
        if ($.isArray(d) && d.length > 1) {
            a = this.sideBar_.find('[data-nav="' + d[1] + '"]')
        }
    }
    this.sideBar_.find("[data-nav].active").removeClass("active");
    if (a && a.length === 1) {
        a.addClass("active");
        return true
    } else {
        return false
    }
}
;
sensorsdata.IndexPage.prototype.initPage = function(b) {
    var d = window.location.pathname;
    var f = window.location.hash;
    if (b) {
        var g = (/(\/.+\/)(#.+)?/).exec(b);
        if ($.isArray(g) && g.length > 1 && g[1]) {
            d = g[1];
            f = g[2] || this.urlRememberObj[d] || ""
        }
    }
    this.setSideActive_(d, f);
    if (location.pathname !== d || location.search !== this.search_ || location.hash !== f) {
        this.rememberUrl_();
        var c = d + this.search_ + f;
        window.history.pushState(c, "", c)
    }
    var e = this;
    var a = this.formatPageName_(d);
    sensorsdata.clearReportAjax();
    sensorsdata.ajax({
        url: "events/all",
        success: function(m) {
            if (!$.isArray(m)) {
                sensorsdata.error.show(sensorsdata.languages.get("数据格式错误，请联系技术人员<!--{en}Data in wrong format, please contact with technicians-->"))
            }
            var o = Object.keys(sensorsdata.CONSTSET.urlNoEvents);
            var k = sensorsdata.CONSTSET.urlNoEvents[d];
            var n = o.indexOf(d) >= 0 && (!k || ("#" + k) === f);
            if (m.length > 0) {
                var j = sensorsdata.cache.eventsMap = {};
                for (var l = 0, h = m.length; l < h; l++) {
                    j[m[l].name] = m[l]
                }
                sensorsdata.cache.events = m;
                sensorsdata.cache.eventsUpdateTime = Date.now();
                e.events_ = $.extend(true, [], sensorsdata.cache.events)
            }
            if (m.length === 0 && n === false) {
                d = a = "/import/"
            }
        }
    }).then(function() {
        return sensorsdata.ajax({
            url: "partitions/list?extremum=true",
            success: function(h) {
                if ($.isArray(h) && h.length > 0) {
                    sensorsdata.cache.partitions = $.extend(true, [], h)
                }
            }
        })
    }).then(function() {
        var j = $.Deferred();
        if (!$.isArray(e.events_) || e.events_.length === 0) {
            j.reject();
            return j
        }
        var i = sensorsdata.unparam(window.location.hash);
        var h = i[sensorsdata.CONSTSET.bookmarkId];
        if (!$.isNumeric(h)) {
            j.resolve();
            return j
        }
        return sensorsdata.ajax({
            customErrorStatusCode: 410,
            url: "bookmarks/bookmark/" + h,
            error: function() {
                var m = sensorsdata.unparam(window.location.hash);
                delete m[sensorsdata.CONSTSET.bookmarkId];
                var l = "#" + $.param(m);
                var k = d + (l ? l : "");
                window.history.pushState(k, "", k)
            }
        })
    }).always(function() {
        if (sensorsdata.authority.isAdmin) {
            sensorsdata.monitorModel.updateList()
        }
        e.renderPage_(a)
    })
}
;
sensorsdata.IndexPage.prototype.formatPageName_ = function(a) {
    if (!a) {
        return ""
    }
    var b = a.split("/").filter(function(c) {
        return c !== ""
    });
    if (b.length > 0) {
        return "/" + b[b.length - 1] + "/"
    }
    return ""
}
;
sensorsdata.IndexPage.prototype.renderPage_ = function(a) {
    if (window.page && $.isFunction(window.page.unload)) {
        window.page.unload();
        sensorsdata.clearReportAjax()
    }
    window.pageName = window.location.pathname;
    $("title").text(sensorsdata.CONSTSET.urlMap[a] + "-" + sensorsdata.theme.label.titleSuffix);
    this.renderViewPortWarning_(a);
    var b = {
        container: this.saMainDom_,
        events: this.events_,
        initPage: sensorsdata.bind(this.initPage, this),
        closeLoading: sensorsdata.bind(this.closeLoading, this)
    };
    this.showLoading();
    switch (a) {
    case "/behavior-path/":
        window.page = new sensorsdata.UserBehaviorPath(b);
        break;
    case "/data-stream/":
        window.page = new sensorsdata.DataStreamPage(b);
        break;
    case "/track-manager/":
        window.page = new sensorsdata.TrackManager(b);
        break;
    case "/import-status/":
        window.page = new sensorsdata.ImportStatus(b);
        break;
    case "/users/":
        window.page = new sensorsdata.UsersListPage(b);
        break;
    case "/sequence/":
        window.page = new sensorsdata.UserEventsPage(b);
        break;
    case "/segmentation/":
        window.page = new sensorsdata.SegmentationIndexPage(b);
        break;
    case "/funnel/":
        window.page = new sensorsdata.FunnelIndexPage(b);
        break;
    case "/retention/":
        window.page = new sensorsdata.RetentionIndexPage(b);
        break;
    case "/addiction/":
        window.page = new sensorsdata.RetentionAddictionPage(b);
        break;
    case "/web-click/":
        window.page = new sensorsdata.WebClickPage(b);
        break;
    case "/app-click/":
        window.page = new sensorsdata.AppClickIndexPage(b);
        break;
    case "/web-click-map/":
        window.page = new sensorsdata.WebClickMapPage(b);
        break;
    case "/import/":
        window.page = new sensorsdata.ImportPage(b);
        break;
    case "/clustering/":
        window.page = new sensorsdata.ClusteringIndexPage(b);
        break;
    case "/user_analytics/":
        window.page = new sensorsdata.UserAnalyticsIndexPage(b);
        break;
    case "/dashboard/":
        window.page = new sensorsdata.DashboardPage(b);
        break;
    case "/events/":
        window.page = new sensorsdata.MetaManager(b);
        break;
    case "/auth/":
        window.page = new sensorsdata.AuthManage(b);
        break;
    case "/simulator/":
        window.page = new sensorsdata.DataSimulator(b);
        break;
    case "/vtrack/":
        window.page = new sensorsdata.VisualTrackingManager(b);
        break;
    case "/monitor-manager/":
        if (sensorsdata.authority.isAdmin) {
            window.page = new sensorsdata.MonitorManage(b)
        } else {
            location.replace("/segmentation/")
        }
        break;
    default:
        this.closeLoading()
    }
}
;
sensorsdata.IndexPage.prototype.renderViewPortWarning_ = function(a) {
    var c = sensorsdata.CONSTSET;
    var b = c.mobilePages.indexOf(a) === -1 && $("body").width() < c.minBodyWidth;
    $("div.viewport-warning:first").toggle(b)
}
;
sensorsdata.IndexPage.prototype.checkUrl_ = function(b) {
    var a = this.formatPageName_(b);
    return b && b !== "/" && sensorsdata.CONSTSET.urlMap[a] && sensorsdata.authority.checkPageAuth(a)
}
;
sensorsdata.IndexPage.prototype.setDefaultUrl_ = function() {
    var f = window.location.pathname || "";
    var b = window.location.search || "";
    var e = window.location.hash || "";
    if (!this.checkUrl_(f)) {
        f = this.urlRememberObj.lastPathname || "";
        e = ""
    }
    if (!this.checkUrl_(f)) {
        f = "/dashboard/";
        e = ""
    }
    if (f === "/dashboard/") {
        var c = this;
        var d = sensorsdata.unparam(e);
        sensorsdata.dashboardModel.checkId(Number(d.dashid), function(g) {
            if (g) {
                e = "#" + $.param(d)
            } else {
                f = "/segmentation/";
                e = c.urlRememberObj[f] || ""
            }
            var h = f + b + e;
            window.history.replaceState(h, "", h)
        });
        return
    } else {
        if (!e || e === "#") {
            e = this.urlRememberObj[f] || ""
        }
    }
    var a = f + b + e;
    window.history.replaceState(a, "", a)
}
;
sensorsdata.IndexPage.prototype.getConfig_ = function(b) {
    var a = this;
    return sensorsdata.ajax({
        showLoader: false,
        url: "config",
        success: function(c) {
            if (!$.isEmptyObject(c)) {
                $('#user-dropdown li a[data-method="build-channel-link"]').parent().toggle(c.enable_short_url_service === true).toggle(sensorsdata.authority.isAdmin || (sensorsdata.authority.isAnalyst && c.allow_analyst_short_url));
                $("#app-click-menu").toggle(c.allow_app_click_heat_map === true);
                $('a[data-method="switch-lang"]').parent("li:first").toggle(!!c.enable_multi_language);
                sensorsdata.cache.config = c;
                if ($.isEmptyObject(a.config_)) {
                    a.config_ = c
                }
                if ($.isFunction(b)) {
                    b(c)
                }
            }
        }
    })
}
;
sensorsdata.IndexPage.prototype.getProject_ = function(a) {
    return sensorsdata.ajax({
        showCommonError: false,
        showLoader: false,
        url: "project/" + (a || "default"),
        success: function(b) {
            if (!$.isEmptyObject(b)) {
                sensorsdata.cache.project = {
                    id: b.id,
                    name: b.name,
                    cname: b.cname
                };
                $(".sa-alpha").text(b[sensorsdata.languages.get("cname<!--{en}name-->")]).show();
                window.eventCenter.trigger("IndexPage:getProjectSuccess", b)
            } else {
                sensorsdata.info.show(sensorsdata.languages.get("无效的项目，请确保输入正确的链接<!--{en}Invalid item. Please make sure to enter the correct link.-->"))
            }
        }
    })
}
;
sensorsdata.IndexPage.prototype.checkLicense_ = function() {
    var m = moment(sensorsdata.cache.config.build_time);
    var u = moment(this.config_.build_time);
    if (m.isValid() && u.isValid() && m.isAfter(u)) {
        $("#sa_head_about").addClass("new-version-pointer");
        var q = sensorsdata.localStorage.getJSON("sensorsdata-status", "cxTipsUpdate");
        if (!q || (new Date() - q > 1000 * 60 * 60 * 24)) {
            sensorsdata.info.show({
                content: sensorsdata.util.format(sensorsdata.languages.get('当前版本已更新为#{build_version}，请刷新后使用 <a href="javascript:void(0)" data-action="reload" data-id="{{id}}">刷新页面</a><!--{en}The current version has been updated to #{build_version}，Please refresh it and use it later<a href="javascript:void(0)" data-action="reload" data-id="{{id}}">Refresh</a>-->'), {
                    build_version: sensorsdata.cache.config.build_version
                }),
                isclose: true,
                autohide: false,
                marker: "versionUpdated",
                onclose: function() {
                    sensorsdata.localStorage.setJSON("sensorsdata-status", "cxTipsUpdate", new Date().getTime())
                },
                onreload: function() {
                    sensorsdata.localStorage.setJSON("sensorsdata-status", "reloadUpdate", true)
                }
            })
        }
    } else {
        if (sensorsdata.localStorage.getJSON("sensorsdata-status", "reloadUpdate")) {
            sensorsdata.localStorage.removeJSON("sensorsdata-status", "reloadUpdate");
            sensorsdata.success.show(sensorsdata.languages.get("更新完成，可正常使用<!--{en}Update completed, can be used normally-->"))
        }
    }
    var s = sensorsdata.cache.config.loader_info;
    if (s && s.latency >= 100000 && (new Date() - s.earliest_nginx_log_time >= 1000 * 60 * 10)) {
        var h = sensorsdata.localStorage.getJSON("sensorsdata-status", "cxTipsLatency");
        if (!h || (new Date() - h > 1000 * 60 * 60 * 24)) {
            var g = moment(s.earliest_nginx_log_time);
            var l = moment(new Date()).startOf("day");
            var k = "YYYY-MM-DD HH:mm";
            if (g.isAfter(l)) {
                k = sensorsdata.languages.get("今天 HH:mm<!--{en}Today HH:mm-->")
            } else {
                if (g.isAfter(l.clone().subtract(1, "day"))) {
                    k = sensorsdata.languages.get("昨天 HH:mm<!--{en}Yesterday HH:mm-->")
                }
            }
            sensorsdata.warning.show({
                content: sensorsdata.util.format(sensorsdata.languages.get("正在导入 #{date} 后的数据，请等待<!--{en}Importing the data after #{date}, please wait-->"), {
                    date: g.format(k)
                }),
                isclose: true,
                autohide: false,
                marker: "importingTheData",
                onclose: function() {
                    sensorsdata.localStorage.setJSON("sensorsdata-status", "cxTipsLatency", new Date().getTime())
                }
            })
        }
    }
    var i = sensorsdata.cache.config.license || {};
    var a = sensorsdata.CONSTSET;
    var c = moment().startOf("day");
    var e = moment(i.install_time, a.timeFormat);
    var o = moment(i.remind_time, a.timeFormat);
    var p = moment(i.expire_time, a.timeFormat);
    var v = moment(i.dead_time, a.timeFormat);
    if (!e.isValid() || !o.isValid() || !p.isValid() || !v.isValid()) {
        return
    }
    var b = p.clone().subtract(1, "day");
    var x = v.clone().subtract(1, "day");
    this.licenseItems_ = [];
    this.licenseItems_.push({
        name: sensorsdata.languages.get("安装时间<!--{en}Installation time-->"),
        value: e.format(a.dateFormat),
        desc: sensorsdata.languages.get("系统部署的时间。<!--{en}System deployment time.-->")
    });
    var n = c.diff(p) >= 0;
    var r = b.format(a.dateFormat);
    this.licenseItems_.push({
        name: sensorsdata.languages.get("到期时间<!--{en}Expiration time-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的服务的截止日期，到期后暂时无法导入数据。<!--{en}The expiration date of the service you purchased, which the data cannot be imported for the time being.-->"),
        isMatch: n,
        matchText: sensorsdata.util.format(sensorsdata.languages.get("已停止导入数据，您购买的服务已于 #{value} 到期。<!--{en}The data importing has been stopped, the service you purchased has been expired by #{value}-->"), {
            value: r
        })
    });
    n = c.diff(v) >= 0;
    r = x.format(a.dateFormat);
    this.licenseItems_.push({
        name: sensorsdata.languages.get("停止时间<!--{en}End time-->"),
        value: r,
        desc: sensorsdata.languages.get("到期后，您的服务将无法使用。<!--{en}Your service will not be available after expiration .-->"),
        isMatch: n,
        matchText: sensorsdata.util.format(sensorsdata.languages.get("已暂停服务，您购买的服务已于 #{expireTime} 到期。<!--{en}The service has been suspended.The service you purchased has been expired by  #{expireTime}-->"), {
            expireTime: b.format(a.dateFormat)
        })
    });
    r = i.project_num + "/" + (i.max_project_num > 0 ? i.max_project_num : sensorsdata.languages.get("无限制<!--{en}Unlimited-->"));
    this.licenseItems_.push({
        name: sensorsdata.languages.get("项目限额<!--{en}Project quota-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的最大项目个数。<!--{en}The maximum number of items you have purchased。-->"),
        isMatch: i.max_project_num > 0 && i.project_num > i.max_project_num,
        matchText: sensorsdata.languages.get("已停止导入数据，当前项目数已超过您购买的最大限额。<!--{en}Data importing has been stopped.The current amount of items has exceeded the maximum amount you purchased.-->")
    });
    r = sensorsdata.formatNumber(i.message_num) + "/" + (i.max_message_num > 0 ? sensorsdata.formatNumber(i.max_message_num) : sensorsdata.languages.get("无限制<!--{en}Unlimited-->"));
    var t = {
        name: sensorsdata.languages.get("数据限额<!--{en}Data quota-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的最大数据接入量条数。<!--{en}The maximum amount of data access you have purchased。-->"),
        isMatch: false,
        matchText: "",
        redText: ""
    };
    if (i.max_message_num > 0) {
        t.isMatch = i.message_num > Math.floor(i.max_message_num * 0.95);
        if (t.isMatch) {
            if (i.message_num >= i.max_message_num) {
                t.matchText = sensorsdata.languages.get("已停止导入数据，当前数据量已超过您购买的最大数据接入量限额。<!--{en}Data importing has been stopped.The current amount of data has exceeded the maximum amount of data access you purchased.-->")
            } else {
                t.matchText = sensorsdata.languages.get("当前数据量即将超过您购买的最大数据接入量限额，超过后会停止导入数据。<!--{en}The current amount of data is about to exceed the maximum amount of data access you purchased.The data importing will be stopped after exceeding.-->");
                t.redText = sensorsdata.languages.get("即将超出，超出后停止导入数据。<!--{en}Is about to exceed the maximum amount.The data importing will be stopped after exceeding.-->")
            }
        }
    }
    this.licenseItems_.push(t);
    r = i.node_num + "/" + (i.max_node_num > 0 ? i.max_node_num : sensorsdata.languages.get("无限制<!--{en}Unlimited-->"));
    this.licenseItems_.push({
        name: sensorsdata.languages.get("节点限额<!--{en}Node limit-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的最大节点数限额。<!--{en}Maximum number of nodes you purchase.-->"),
        isMatch: i.max_node_num > 0 && i.node_num > i.max_node_num,
        matchText: sensorsdata.languages.get("已停止导入数据，当前节点数已超过您购买的最大节点个数。<!--{en}The data importing has been stopped. The current number of nodes exceeds the maximum number of nodes you have purchased.-->")
    });
    r = i.core_num + "/" + (i.max_core_num > 0 ? i.max_core_num : sensorsdata.languages.get("无限制<!--{en}Unlimited-->"));
    this.licenseItems_.push({
        name: sensorsdata.languages.get("核数限额<!--{en}CPU quota-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的单节点最大核数限额。<!--{en}The maximum  CPU quota you have purchased for a single node.-->"),
        isMatch: i.max_core_num > 0 && i.core_num > i.max_core_num,
        matchText: sensorsdata.languages.get("已停止导入数据，当前单节点最大核数已超过您购买的单节点最大核数。<!--{en}The data importing has been stopped.The current CPU core number of single nodes exceeds the maximum  CPU core number of single nodes you purchased.-->")
    });
    r = i.memory_gb + "/" + (i.max_memory_gb > 0 ? i.max_memory_gb + "G" : sensorsdata.languages.get("无限制<!--{en}Unlimited-->"));
    this.licenseItems_.push({
        name: sensorsdata.languages.get("内存限额<!--{en}Memory limit-->"),
        value: r,
        desc: sensorsdata.languages.get("您购买的单节点最大内存限额。<!--{en}The maximum memory limit you have purchased for a single node.-->"),
        isMatch: i.max_memory_gb > 0 && i.memory_gb > i.max_memory_gb,
        matchText: sensorsdata.languages.get("已停止导入数据，当前单节点最大内存已超过您购买的单节点最大内存。<!--{en}The data importing has been stopped. The current maximum memory per node exceeds the maximum memory you purchased.-->")
    });
    sensorsdata.cache.licenseItems = this.licenseItems_;
    $('li[data-for="sa_head_about"]').show();
    var d = $(".sa-expire-remind");
    var j = this.licenseItems_.filter(function(y) {
        return y.isMatch === true
    });
    var f = "";
    if (j.length > 0) {
        f = j[0].matchText;
        d.removeClass("green").addClass("red")
    } else {
        if (c.diff(o) >= 0) {
            d.removeClass("red").addClass("green");
            f = sensorsdata.util.format(sensorsdata.languages.get("系统授权将于 #{expireTime} 到期，到期后暂时无法导入数据。<!--{en}System authorization will expire at #{expireTime} and will not be able to import data when expired.-->"), {
                expireTime: b.format(a.dateFormat)
            })
        }
    }
    if (f) {
        d.show().tooltip({
            container: "body",
            placement: "right",
            title: f,
            trigger: "hover",
            viewport: "body"
        });
        var w = this;
        sensorsdata.authority.getSetting(function(y) {
            if (!y.licenseRemind) {
                w.popAbout_();
                sensorsdata.authority.updateSetting({
                    licenseRemind: true
                })
            }
        })
    } else {
        if (sensorsdata.authority.setting.licenseRemind) {
            sensorsdata.authority.updateSetting({
                licenseRemind: false
            });
            d.hide()
        }
    }
}
;
sensorsdata.IndexPage.prototype.checkVersionFeatures_ = function() {
    var a = this;
    sensorsdata.authority.getSetting(function(c) {
        var b = "1.7";
        if (c[b] === "over") {
            return
        }
        a.$headNav_.find('.username span:last-child,[data-method="version-features"]').addClass("new-version-pointer");
        if (!c[b] && a.$headNav_.find(".username span:last-child").is(":visible")) {
            a.popVersionFeatures_(b)
        }
    })
}
;
sensorsdata.IndexPage.prototype.popVersionFeatures_ = function(a) {
    var e = {
        background: "1.7-bg.png",
        features: [{
            isActive: true,
            img: "1.7-web-click.png",
            title: sensorsdata.languages.get("点击分析<!--{en}Click analysis-->"),
            desc: sensorsdata.languages.get("基于真实页面的点击效果展示，让你更加直观的看出页面中的点击分布情况。<!--{en}Display based on the real page click effect which provides a more intuitive page click distribution.-->"),
            link: "https://sensorsdata.cn/blog/ru-he-yun-yong-dian-ji-fen-xi-you-hua-chan-pin-ti-yan/"
        }, {
            img: "1.7-new-funnel.png",
            title: sensorsdata.languages.get("漏斗分析<!--{en}Funnel analysis-->"),
            desc: sensorsdata.languages.get("漏斗分析全新改版！让你可以按天查看漏斗的变化趋势，还可以进行漏斗的对比。<!--{en}Funnel analysis, new revision! Support to view the funnel trend by day and compare the funnels.-->"),
            link: "https://www.sensorsdata.cn/manual/funnel.html"
        }]
    };
    var c = $($("#tpl-new-version-tip-modal").html());
    c.html(Mustache.render(c.html(), e));
    var b = {};
    var g = function(h) {
        if (!$.isEmptyObject(b)) {
            if (h === b[a]) {
                return
            }
            if (h === "doing" && b[a]) {
                return
            }
        }
        sensorsdata.authority.getSetting(function(i) {
            b = i || {};
            if (h === b[a]) {
                return
            }
            if (h === "doing" && b[a]) {
                return
            }
            b[a] = h;
            sensorsdata.authority.updateSetting(b)
        })
    };
    var f = c.find(".version-slider");
    var d = this;
    c.find(".right").off("click").on("click", function() {
        var h = c.find(".navigator .active").next();
        if (h.length === 0) {
            f.animate({
                left: 0
            });
            c.find(".navigator .active").removeClass("active");
            c.find(".navigator span:first").addClass("active")
        } else {
            var i = parseInt(f.css("left"), 10) || 0;
            f.animate({
                left: i - 700
            });
            c.find(".navigator .active").removeClass("active");
            h.addClass("active")
        }
        if (h.next().length === 0) {
            g("over");
            d.$headNav_.find('.username span:last-child,[data-method="version-features"]').removeClass("new-version-pointer")
        } else {
            g("doing")
        }
    });
    c.find(".left").off("click").on("click", function() {
        var h = c.find(".navigator .active").prev();
        if (h.length === 0) {
            f.animate({
                left: (e.features.length - 1) * -700
            });
            c.find(".navigator .active").removeClass("active");
            c.find(".navigator span:last").addClass("active")
        } else {
            var i = parseInt(f.css("left"), 10) || 0;
            f.animate({
                left: i + 700
            });
            c.find(".navigator .active").removeClass("active");
            h.addClass("active")
        }
    });
    c.find(".navigator span").off("click").on("click", function() {
        var h = $(this);
        h.addClass("active").siblings(".active").removeClass("active");
        f.animate({
            left: h.prevAll().length * -700
        })
    });
    c.modal({
        backdrop: "static",
        keyboard: false
    });
    c.off("hidden.bs.modal").on("hidden.bs.modal", function() {
        g("doing")
    })
}
;
sensorsdata.IndexPage.prototype.showLoading = function() {
    $("body").addClass("sa-loading");
    this.loadingBar_.show()
}
;
sensorsdata.IndexPage.prototype.closeLoading = function() {
    $("body").removeClass("sa-loading");
    this.loadingBar_.hide()
}
;
$(function() {
    window.eventCenter.trigger("IndexPage:prevInit");
    if (!sensorsdata.theme || !sensorsdata.theme.notInitPage) {
        sensorsdata.indexPage = new sensorsdata.IndexPage()
    }
});
