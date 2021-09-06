# Nunjucks Starter

To begin you'll need NodeJS or Yarn.

`npm install` or `yarn install`

This starter use gulp for it's pipeline and have this features:

- SCSS to CSS files from `src/scss`
- SVG Sprite by combining all files in `src/icons/*.svg`
- Optimizing images in `src/img` and copy them in the `dist` folder
- Compile JS files in `src/js` with `@babel/env`
- Live reload all the things with **BrowserSync** 🚀

## Development

To start the development server, you need to run the watch script.

`npm run watch` or `yarn watch`

Then go to [http://localhost:1234/index.html](http://localhost:1234/index.html)

## Production

To build HTML and CSS files :

`npm run build` or `yarn build`

# Fonctionnement

This starter use [Nunjucks](https://mozilla.github.io/nunjucks/) for it's templating engine. To create a page, you have to create a file in the `src` folder with the name of your page. For example `src/my-page.njk`. This will generate a file called my-page.html and you'll be able to access it in your browser.

Nunjucks page example:

```nunjucks
{% extends "./layouts/home.njk" %}

{% block content %}
    <h1>Page 1</h1>
{% endblock %}
```
