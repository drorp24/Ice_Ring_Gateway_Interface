const express = require('express')
const bodyParser = require('body-parser')
const db = require('./queries')


const app = express()
const port = 8000

app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.get('/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' })
  })

app.listen(port, () => {
console.log(`App running on port ${port}.`)
})
app.get('/recommandations', db.getAllRecommendations)
app.get('/recommandations/:run_id', db.getAllRecommendationsByRunId)
app.get('/getDirectivesByRunId/:run_id', db.getDirectivesByRunId)
app.get('/getRequestsByRunId/:run_id', db.getRequestsByRunId)
app.get('/getResourcesByRunId/:run_id', db.getResourcesByRunId)
app.get('/getLatestRuns/:amount?', db.getLatestRunIds)
app.get('/getLatestPublishedRuns/:amount?', db.getLatestPublishedRunIds)