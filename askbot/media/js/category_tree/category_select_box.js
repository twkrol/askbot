/* global askbot, inherits, Category, CategoryAdder, SelectBox */
/**
 * @constructor
 * SelectBox subclass to create/edit/delete
 * categories
 */
var CategorySelectBox = function () {
    SelectBox.call(this);
    this._item_class = Category;
    this._category_adder = undefined;
    this._tree = undefined;//cat tree
    this._level = undefined;
};
inherits(CategorySelectBox, SelectBox);

CategorySelectBox.prototype.setState = function (state) {
    this._state = state;
    if (state === 'select') {
        if (this._category_adder) {
            this._category_adder.setState('disabled');
        }
        $.each(this._items, function (idx, item) {
            item.setState('display');
        });
    } else if (state === 'editable') {
        this._category_adder.setState('waiting');
        $.each(this._items, function (idx, item) {
            item.setState('editable');
        });
    }
};

CategorySelectBox.prototype.setCategoryTree = function (tree) {
    this._tree = tree;
};

CategorySelectBox.prototype.getCategoryTree = function () {
};

CategorySelectBox.prototype.setLevel = function (level) {
    this._level = level;
};

CategorySelectBox.prototype.getNames = function () {
    var names = [];
    $.each(this._items, function (idx, item) {
        names.push(item.getName());
    });
    return names;
};

CategorySelectBox.prototype.appendCategoryAdder = function () {
    var adder = new CategoryAdder();
    adder.setLevel(this._level);
    adder.setCategoryTree(this._tree);
    this._category_adder = adder;
    this._element.append(adder.getElement());
};

CategorySelectBox.prototype.createDom = function () {
    CategorySelectBox.superClass_.createDom.call(this);
    if (askbot.data.userIsAdmin) {
        this.appendCategoryAdder();
    }
};

CategorySelectBox.prototype.decorate = function (element) {
    CategorySelectBox.superClass_.decorate.call(this, element);
    this.setState(this._state);
    if (askbot.data.userIsAdmin) {
        this.appendCategoryAdder();
    }
};
