# orama-js: Fields Boosting
URL: /docs/orama-js/search/fields-boosting
Source: https://raw.githubusercontent.com/oramasearch/docs/refs/heads/main/content/docs/orama-js/search/fields-boosting.mdx

Learn how to boost the importance of a field in the search results.
      
***

title: Fields Boosting
description: Learn how to boost the importance of a field in the search results.
--------------------------------------------------------------------------------

You can use the `boost` interface to boost the importance of a field in the search results.

```javascript copy
const searchResult = search(movieDB, {
term: "Harry",
properties: "*",
boost: {
  title: 2,
},
});
```

In this example, we are boosting the `title` field by `2`.

That means that any match of `'Harry'` in the `title` field will be considered twice as important as a match in any other field.

You can boost multiple fields:

```javascript copy
const searchResult = search(movieDB, {
term: "Harry",
properties: "*",
boost: {
  title: 2,
  director: 1.5,
},
});
```

In this example, we are boosting the `title` field by `2` and the `director` field by `1.5`.