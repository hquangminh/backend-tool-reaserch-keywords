const express = require('express')
const puppeteer = require('puppeteer')
const cors = require('cors')
const path = require('path')

const app = express()
const port = process.env.PORT || 3001

// Configure Puppeteer cache path
const PUPPETEER_CACHE_PATH = process.env.PUPPETEER_CACHE_PATH || path.resolve(__dirname, '.cache', 'puppeteer')

app.use(cors())

app.get('/search', async (req, res) => {
  const query = req.query.q
  if (!query) {
    return res.status(400).send('Query parameter is required')
  }

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    })
    const page = await browser.newPage()
    await page.goto(`https://www.google.com/search?q=${query}`, { waitUntil: 'domcontentloaded' })

    // Scroll to load more results
    await page.evaluate(async () => {
      let totalHeight = 0
      let distance = 100
      while (totalHeight < document.body.scrollHeight) {
        window.scrollBy(0, distance)
        totalHeight += distance
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    })

    const results = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.tF2Cxc')).slice(0, 30)
      return items.map((item) => ({
        title: item.querySelector('.DKV0Md')?.innerText || '',
        url: item.querySelector('.yuRUbf a')?.href || '',
        description: item.querySelector('.VwiC3b')?.innerText || '',
      }))
    })

    await browser.close()

    // Log the results before sending the response
    console.log('Search results:', results)
    res.json(results)
  } catch (error) {
    console.error('Error during search:', error)
    res.status(500).send(`Internal server error: ${error.message}`)
  }
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
