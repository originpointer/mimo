# orama-js: Update data
URL: /docs/orama-js/usage/update
Source: https://raw.githubusercontent.com/oramasearch/docs/refs/heads/main/content/docs/orama-js/usage/update.mdx

Learn how to update data in Orama.
      
***

title: Update data
description: Learn how to update data in Orama.
-----------------------------------------------

Orama is optimized to be immutable. Rather than trying to update a document in the database, we suggest you to create the database from scratch.

People that know what they are doing can use the `update` or `updateMultiple` methods, which are just aliases for `remove`/`removeMultiple` followed by a `insert`/`insertMultiple`.