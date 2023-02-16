const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.json([{
    name: 'Bob',
    email: 'bob@gmail.com'
  },
  {
    name: 'Alice',
    email: 'Alice@hotmail.com'
  },
  {
    name: 'Jake',
    email: 'Jake@yahoo.com'
  },
  {
    name: 'Maria',
    email: 'Maria@yahoo.com'
  }])
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})