(function (M) {

  /* view to manage list of pages - add, remove and show them */
  var PageListView = Backbone.View.extend({
    tagName: 'div',
    className: '',
    id: 'pages',
    events: {
      'click .pagename .disp': 'showPage',
      'click #addPage': 'addPage',
      'click .pagename .remove': 'removePage',
      'click #menu-config': 'showMenu',
    },
    initialize: function() {
      _.bindAll(this);
      _.bind(this.render, this);
      this.template = _.template($('#page-list-template').html());
      this.listTemplate = _.template($('#page-list-item-template').html());
      // append this.el to container #pages
      $('#content-container').append(this.$el);
      this.$el.append(this.template());
      this.$pagelist = $('#pagelist');
      var menu = M.site_content.menu;
      //console.log(menu);
      this.menuconfig = new M.types.model.menu(menu);
      this.menuconfigview = new MenuConfigView({model: this.menuconfig});
    },
    render: function() {
      // append the page list
      this.$pagelist.html('');
      _.each(M.pages.models, function(page) {
        this.$pagelist.append(this.listTemplate({
          name: page.get('name') || 'newpage',
          id: page.id
        }));
      }, this);
    },
    showPage: function(event) {
      var id = $(event.target).attr('id');
      pageview = new PageView({model: M.pages.get(id)});
      pageview.render();
      M.editor.pageview = pageview;
    },
    addPage: function() {
      var newpage = new M.types.model.Page();
      M.pages.add(newpage);
      var newpageview = new PageView({model: newpage});
      newpageview.render();
      M.editor.pageview = newpageview;
    },
    removePage: function(event) {
      var option = confirm("Are you sure, you want to delete this page?");
      if(!option) {
        return false;
      }
      var id = $(event.target).parent('.remove').attr('for');
      var success_template = _.template($('#success-notif').html());
      var fail_template = _.template($('#fail-notif').html());
      //console.log('remove', id);
      M.pages.get(id).destroy({
        success: function(model, response) {
          //console.log('deleted', model, response);
          M.pages.remove(id);
          M.pagelistview.render();
          if(M.editor.pageview) {
            M.editor.pageview.remove();
          }
          $('#notifications').html(success_template({
            title: 'Deleted',
            msg: ''
          }));
        },
        error: function(model, xhr) {
          console.log('failed', model, xhr);
          $('#notifications').html(fail_template({
            title: 'Error',
            msg: 'Failed to delete. Please try again.'
          }));
        }
      });
    },
    showMenu: function(event) {
      this.menuconfigview.render();
    },
    // validate the page list with menu order list
    validate: function()  {
      //TODO: validate if the menu order list matches with the list of pages
      //and provide relevant notifications
    }
  });

  var Pages = Backbone.Collection.extend({
    model: M.types.model.Page,
    url: '/page'
  });

  /* view to manage each page and their properties - change page properties,
   * add content, remove and show content, and update the page */
  var PageView = Backbone.View.extend({
    tagName: 'div',
    id: 'page',
    events: {
      'click #updatePage': 'updatePage',
      'click .addContent' : 'addContent',
      'click .content-item': 'showContent',
      'click .content .remove': 'removeContent'
    },
    initialize: function() {
      _.bindAll(this);
      _.bind(this.render, this);
      this.editing = false;
      this.edit_idx = -1;
      $('#page').remove();
      $('#content-container').append(this.$el);
      this.template = _.template($('#page-template').html());
      this.contentListTemplate =
        _.template($('#content-list-template').html());
      //this.model.bind('change', this.modelChanged);
      //this.model.bind('change:content', this.contentChanged);
      this.model.bind('change:name', this.nameChanged);
    },
    modelChanged: function(page) {
      //console.log('model changed ', page.id, ' re-rendering...');
      this.render();
    },
    contentChanged: function(page) {
      //console.log('content changed', page);
      this.render();
    },
    nameChanged: function(page) {
      //M.pagelistview.render();
      //console.log('name changed', page);
    },
    render: function() {
      $('#page').html('');
      //console.log('content: ', this.model.get('content'));

      this.$el.html(this.template({
        name: this.model.get('name'),
        title: this.model.get('title'),
        children: this.model.get('children'),
        content: this.listContent(),
        checked: this.model.get('showNav') ? 'checked="checked"' : ''
      }));

      //hover effect
      $('.content-item').hover(function(event) {
        $(event.target).closest('.content-item').addClass('alert-error')
      }, function(event) {
        $(event.target).closest('.content-item').removeClass('alert-error')
      });
    },
    listContent: function() {
      var content = '';
      _.each(this.model.get('content'), function(element, idx) {
        content += this.contentListTemplate({
          no: idx,
          type: element.type,
          more: element.src ||
            escapeHtml(element.data.substring(0, 30) + '..'),
          title: (element.title) ? element.title + ',' : ''
        });
      }, this);
      return content;
    },
    showContent: function(event) {
      var idx = $(event.target).closest('.content-item').attr('id').
        split('-')[1];
      var content = this.model.get('content')[idx];
      content = new M.types.model[content.type](content);
      this.editing = true;
      this.edit_idx = idx;
      var contentview = new ContentView({model: content});
      contentview.render();
      M.editor.contentview = contentview;
      return false;
    },
    addContent: function() {
      //console.log('addContent');
      var content = new M.types.model.text({
        type: 'text',
        title: '',
        data: ''
      });
      this.editing = true;
      this.edit_idx = -1;
      var contentview = new ContentView({model: content});
      contentview.render();
      M.editor.contentview = contentview;
      return false;
    },
    updateContent: function(json) {
      if(!this.editing) {
        return;
      }
      //console.log('updateContent in Pageview');
      var content = this.model.get('content');
      if(this.edit_idx > -1) {
        content[this.edit_idx] = json;
      }
      else {
        content.push(json);
      }

      this.editing = false;
      this.edit_idx = -1;
      //console.log('setting content in page: ', content);
      this.model.set({'content': content});
      this.render();
    },
    removeContent: function(event) {
      //console.log('recvd remove event..about to process..');
      var content = this.model.get('content');
      var idx = $(event.target).parent().attr('for');
      idx = Number(idx); //is this a correct way of doing it?
      //console.log('remove content: ', content[idx]);
      content.splice(idx, 1);
      this.model.set({'content': content});
      //console.log('after removing: ', this.model.get('content'));
      this.render();
      return false;
    },
    updatePage: function() {
      var success_template = _.template($('#success-notif').html());
      var fail_template = _.template($('#fail-notif').html());

      var name = $('#name').val();
      var title = $('#title').val();
      var children = $('#children').val();
      children = (children === '') ? [] : children.split(',');
      this.model.set({'name': name, 'title': title, 'children': children});

      if($('#showNav').is(':checked')) {
        this.model.set({'showNav': true});
      }
      else {
        this.model.set({'showNav': false});
      }

      this.model.save({}, {
        success: function(model, response) {
          //console.log('saved', model, response);
          model.set(response.page);
          model.id = response.page.id;
          M.pagelistview.render();
          $('#notifications').html(success_template({
            title: 'Saved',
            msg: ''
          }));
        },
        error: function(model, xhr) {
          console.log('failed', model, xhr);
          $('#notifications').html(fail_template({
            title: 'Error!',
            msg: 'Something went wrong, and the page could not be updated'
          }));
        }
      });
      return false;
    }
  });

  /* view to manage, render and update each content */
  var ContentView = Backbone.View.extend({
    id: 'contentview',
    events: {
      'click #done': 'done',
      'click #updateContent': 'update',
      'change .contentview select': 'typeChanged'
    },
    initialize: function() {
      _.bindAll(this);
      _.bind(this.render, this);

      $('#pages').hide();
      $('#page').hide();
      $('#content-container').append(this.$el);
      this.template = _.template($('#content-template').html());
    },
    render: function() {
      this.$el.html('');
      var type = this.model.get('type');
      this.$el.append(this.template({
        type: this.model.get('type'),
        title: this.model.get('title'),
        tags: this.model.get('tags')
      }));

      this.$select = $('.contentview select');
      this.$select.val(type);

      if(type === 'text') {
        var template = _.template($('#text-template').html());
        $('#specific-content').html(template({
          data: this.model.get('data')
        }));
        // init the wysiwig editor
        M.editor.wysiwig('#edit');
      }
      else if(type === 'image' || type === 'video' ||
              type === 'audio' || type === 'plugin') {

        var template = _.template($('#media-template').html());
        $('#specific-content').html(template({
          src: this.model.get('src')
        }));

        //TODO: provide the users a preview
        /*var view = new M.types.view[type]({model: this.model});
         //$('#specific-content.preview').html();
         view.render('.preview');*/
      }
    },
    typeChanged: function(event) {
      var type = this.$select.val();
      //TODO: do validation on type - a list of valid models is in
      //M.types.model
      this.model.set({'type': type});
      this.render();
    },
    update: function() {
      var prop, val, new_attrs = {};
      $('#contentview [m-data-target]').each(function(idx, elem) {
        prop = $(elem).attr('m-data-target');
        if(prop === 'tags') {
          val = $(elem).val().split(',');
        }
        else {
          val = $(elem).val();
        }
        new_attrs[prop] = val;
      });
      new_attrs['type'] = this.$select.val();
      if($('#edit').length) {
        tinymce.triggerSave(false, true);
        new_attrs['data'] = $('#edit').val();
      }
      this.model.set(new_attrs);
      M.editor.pageview.updateContent(this.model.toJSON());
    },
    cleanUp: function() {
      //this.$el.remove();
      this.remove();
      $('#pages').show();
      $('#page').show();
    },
    done: function() {
      this.update();
      this.cleanUp();
    }
  });

  /* view to configure custom navigation menu */
  var MenuConfigView = Backbone.View.extend({
    tagName: 'div',
    id: 'page',
    events: {
      'change #custom-menu': 'customMenuChange',
      'click #updateMenu': 'saveMenu'
    },
    initialize: function() {
      _.bindAll(this);
      this.template = _.template($('#menu-config-template').html());
    },
    render: function() {
      $('#page').remove();
      $('#content-container').append(this.$el);
      //console.log('rendering..', this.$el);
      this.$el.html(this.template({
        menu_order: this.model.get('menuOrder'),
        pos: this.model.get('pos'),
        menu: this.model.get('html')
      }));
      this.$menuOptions = $('.menu-options');
      this.$menuOrder = $('#menu-order-wrap');

      if(this.model.get('customMenu') === true) {
        this.$menuOrder.hide();
        $('#custom-menu').attr('checked', true);
        this.$menuOptions.show({complete: function() {
          //M.editor.wysiwig('#menu');
        }});
      }
    },
    showMenuOptions: function(bool) {
    if(bool === true) {
      this.$menuOrder.hide();
      this.$menuOptions.show({complete: function() {
          //M.editor.wysiwig('#menu');
        }});
      }
      else {
        this.$menuOrder.show();
        this.$menuOptions.hide();
      }
    },
    customMenuChange: function(event) {
      this.$menuOptions = $('.menu-options');
      if($('#custom-menu').is(':checked')) {
        this.model.set({'customMenu': true});
      }
      else {
        this.model.set({'customMenu': false});
      }
      this.showMenuOptions(this.model.get('customMenu'));
    },
    saveMenu: function() {
      //console.log('saving menu..');
      var success_template = _.template($('#success-notif').html());
      var fail_template = _.template($('#fail-notif').html());

      if($('#custom-menu').is(':checked')) {
        var html = $('#menu').val().trim() || '';
        this.model.set({'customMenu': true, 'html': html});
      }
      else {
        var menuOrder = $('#menu-order').val().split(',') || [];
        this.model.set({'customMenu': false, 'menuOrder': menuOrder});
      }
      //console.log('menu model: ', this.model.toJSON());
      this.model.save({}, {
        success: function(model, response) {
          //console.log(model, response);
          $('#notifications').html(success_template({
            title: 'Saved',
            msg: ''
          }));

        },
        error: function(xhr, response) {
          $('#notifications').html(fail_template({
            title: 'Error!',
            msg: 'Something went wrong, and the page could not be updated'
          }));
        }
      });
      //alert('end of save menu');
    }
  });

  M.editor = {
    init: function() {
      M.pages = new Pages(M.site_content.content);
      var pagelistview = new PageListView();
      pagelistview.render();
      M.pages.on('add', function(page) {
        pagelistview.render();
      });
      M.pagelistview = pagelistview;
    },
    wysiwig: function($selector) {
      tinymce.init({
          selector: $selector,
          theme: 'modern',
          height: 300,
          plugins: ["advlist autolink link image lists charmap print preview hr",
                    "anchor pagebreak spellchecker searchreplace wordcount",
                    "visualblocks visualchars code fullscreen insertdatetime",
                    "media nonbreaking save table contextmenu directionality",
                    "emoticons template paste textcolor"
                   ],
          toolbar: "undo redo | styleselect | bold italic | " +
              "alignleft aligncenter alignright alignjustify | " +
              "bullist numlist outdent indent | link image | " +
          "print preview media fullpage | forecolor backcolor emoticons"
      });
    }
  };

  var escapeHtml = function(string) {
    var entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': '&quot;',
      "'": '&#39;',
      "/": '&#x2F;'
    };
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

})(M);
