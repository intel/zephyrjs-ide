# markdown-it.html

A Polymer component to wrap the markdown-it project.

## markdown-it styling

You can theme the markdown-it Polymer component without tainting the
rest of your site if you create a Polymer shared theme. The markdown-it.html
is written to load markdownit-css as the external Polymer shared CSS [1].

The default theme is based on jasonm23/markdonw-css/themes

To construct this file, you can run the following (substitude URL for
whatever base .css you want to include.

```bash
URL=https://raw.githubusercontent.com/jasonm23/markdown-css-themes/gh-pages/swiss.css
cat << EOF > markdownit-css.html
<!-- based on ${URL} -->
<dom-module id="markdownit-css">
  <template>
    <style>

EOF
wget -q -O - "${URL}" >> markdownit-css.html
cat << EOF >> markdownit-css.html

    </style>
  </template
</dom-module>
EOF
```

---
1. https://www.polymer-project.org/1.0/docs/devguide/styling#external-stylesheets

