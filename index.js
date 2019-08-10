const request = require('request-promise')
const regularRequest = require('request')
const cheerio = require('cheerio')
const Nightmare = require('nightmare');
const fs = require('fs')

const nightmare = Nightmare({ show: true })

async function scrapeTitlesRanksAndRatings(){

    const result = await request.get('https://www.imdb.com/chart/moviemeter')
    const $ = await cheerio.load(result)

    const movies = $("tr").map((i, element) => {
        const title = $(element).find("td.titleColumn > a").text()
        const descriptionUrl  = 'https://imdb.com' + $(element).find("td.titleColumn > a").attr('href')
        const imdbRating = $(element).find("td.ratingColumn.imdbRating").text().trim()
        return { title, imdbRating, rank: i, descriptionUrl}
    })
    .get()
    // console.log(movies)
    return movies

}

async function scrapePosterUrl(movies){
    const moviesWithPosterUrls = await Promise.all(
      movies.map(async movie => {
          try {
              const html = await request.get(movie.descriptionUrl)
              const $ = cheerio.load(html)
              movie.posterUrl = 'https://imdb.com' + $('div.poster >  a').attr('href')
              return movie

          } catch (e) {
              console.error(e)
          }
      })
    )
    return moviesWithPosterUrls
}

async function getPosterImageUrl(movies){
    // #photo-container > div > div:nth-child(2) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)

    for (let i = 0; i < movies.length; i++){
        try {
            const posterImageUrl = await nightmare.goto(movies[i].posterUrl).evaluate(() => $(
                '#photo-container > div > div:nth-child(2) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)')
                .attr('src')
            )
            movies[i].posterImageUrl = posterImageUrl
            savePosterImageToDisk(movies[i])

        } catch (e){
            console.error(e)
        }
    }
    return movies

}

async function savePosterImageToDisk(movie){
    regularRequest
        .get(movie.posterImageUrl)
        .pipe(fs.createWriteStream(`posters/${movie.rank}.png`))
        
}

async function main(){
    let movies = await scrapeTitlesRanksAndRatings()
    movies = await scrapePosterUrl(movies)
    movies = await getPosterImageUrl(movies)
    console.log(movies)

}

main()
