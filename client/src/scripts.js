const scripts = {

  test: {
    name: 'Test text input',
    params: [
      { name: 'username', type: 'text', prefix: '@', defaultValue: 'kanyewest' },
      { name: 'password', type: 'text' },
    ],
    run: async ({ username, password } = {}) => {
      alert(username + ': ' + password)
    },
  },

  comment_by_hashtag: {
    name: 'Comment photos from hashtag feed',
    description: 'Will post the same comment: 🔥 @{username}!',
    params: [
      { name: 'hashtag', type: 'text', prefix: '#', defaultValue: 'cats' },
      { name: 'nPhotos', type: 'number', values: [1,2,5,10,20,50] },
    ],
    run: async ({ hashtag, nPhotos }, printLog = console.log) => {
      if (!hashtag) {
        throw new Error(`Empty hashtag field!`)
      }

      printLog(`Fetching photos by hashtag: #${hashtag} ... `)

      const { items } = await instagram.request({
        method: 'get_hashtag_feed',
        params: [ hashtag ]
      })

      printLog(`OK, ${items.length} results`, false)
      console.log(`URLS:`, items.map(instagramUrl))

      const comment_text = item => window.comment_text
          ? window.comment_text(item)
          : `🔥 @${item.user.username}!`

      return safeMap(items.slice(0, nPhotos), item => instagram.request({ method: 'comment', params: [ item.id, comment_text(item) ] }), printLog)
    }
  },

  like_by_hashtag: {
    name: 'Like photos from hashtag feed',
    description: 'Infinity like available!',
    isPRO: true,
    params: [
      { name: 'hashtag', type: 'text', labelText: 'Hashtag', prefix: '#', defaultValue: 'cats' },
      { name: 'nPhotos', type: 'number', labelText: 'Number of photos', values: [1,3,10,20,50,200,Infinity] },
    ],
    run: async ({ hashtag, nPhotos }, printLog = console.log) => {
      if (!hashtag) {
        throw new Error(`Empty hashtag field!`)
      }

      printLog(`Fetching photos by hashtag: #${hashtag} ... `)

      // Phase 1: set up feed generator
      const feed = instagram.page_generator({
        method: 'get_hashtag_feed',
        params: [ hashtag ]
      })

      // Phase 2: pages to list
      const items = new Lazy(feed)
        .peek((page, index) => printLog(`Page ${index}: Fetched ${page.num_results} items.`))
        .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))
        .map(page => makeGenerator(page.items))
        .flat()

      // Phase 3: like each from List
      const liked = items
        .filter((item, index) => {
          if (instagram.isStopped) {
            printLog(`Skipping ${index} ${instagramUrl(item)}: Request was killed`)
            return false
          }

          if (item.has_liked) {
            printLog(`Skipping ${index} ${instagramUrl(item)}: Already liked`)
            return false
          }

          return true
        })
        .take(nPhotos)
        .peek((item, index) => printLog(`Liking item ${index}, ${instagramUrl(item)} ... `))
        .map(item => instagram.request({ method: 'like', params: [item.id] }))
        .peek(({ status }) => printLog(status, false))
        .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))

      // Phase 4: run. if nPhotos is given, take only that much
      const results = await liked.unwrap({ accumulate: true })

      printLog(`FINISHED,
        Total requests: ${results.length},
        Success: ${results.filter(item => item.status == 'ok').length} items,
        Errors: ${results.filter(item => item.status == 'error').length} items`)

      return results
    }
  },

  like_user: {
    name: 'Like User Media',
    params: [
      { name: 'username', type: 'text', prefix: '@', defaultValue: 'robertdowneyjr' },
      { name: 'nPhotos', type: 'number', labelText: 'Number of photos', values: [1,2,5,10,20,50,Infinity] },
    ],
    run: async ({ username, nPhotos } = {}, printLog = console.log) => {
      return likePhotosByUsername(username, nPhotos, printLog)
    }
  },

  comment_by_user: {
    name: 'Comment photos from user',
    params: [
      { name: 'username', type: 'text', prefix: '@', defaultValue: 'ohld' },
      { name: 'nPhotos', type: 'number', values: [1,2,3] },
    ],
    run: async ({ username, nPhotos }, printLog = console.log) => {
      if (!username) {
        throw new Error(`Empty username field!`)
      }

      printLog(`Fetching photos by username: @${username} ... `)

      const { user } = await instagram.request({ method: 'get_user_info', params: [username] })

      const { items } = await instagram.request({
        method: 'get_user_feed',
        params: [ user.pk ]
      })

      printLog(`OK, ${items.length} results`, false)
      console.log(`URLS:`, items.map(instagramUrl))

      const comment_text = item => window.comment_text
          ? window.comment_text(item)
          : `🔥 @${item.user.username}!`

      return safeMap(items.slice(0, nPhotos), item => instagram.request({ method: 'comment', params: [ item.id, comment_text(item) ] }), printLog)
    }
  },

  follow_by_hashtag: {
    name: 'Follow people who posts by hashtag',
    params: [
      { name: 'hashtag', type: 'text', prefix: '#', labelText: 'Hashtag', defaultValue: 'cats' },
      { name: 'nUsers', type: 'number', labelText: 'Number of users', values: [1,5,10,20,50] },
    ],
    run: async ({ hashtag, nUsers }, printLog = console.log) => {
      if (!hashtag) {
        throw new Error(`Empty hashtag field!`)
      }

      printLog(`Fetching photos by hashtag: #${hashtag} ... `)

      const { items } = await instagram.request({
        method: 'get_hashtag_feed',
        params: [ hashtag ]
      })

      printLog(`OK, ${items.length} results`, false)
      console.log(`URLS:`, items.map(instagramUrl))

      return followList(items.map(item => item.user), nUsers, printLog)
    }
  },

  like_location: {
    params: [
      { name: 'location_name', type: 'text', labelText: 'Location name' },
      { name: 'nPhotos', type: 'number', labelText: 'Number of photos', values: [1,2,5,10,20,50] },
    ],
    run: async ({ location_name, nPhotos }, printLog = console.log) => {
      const { items: locations } = await instagram.request({ method: 'search_location', params: [location_name] })

      if (!locations.length) throw new Error(`Location ${location_name} not found`)

      printLog(`Location search by '${location_name}': found ${locations.length} items.`)

      const { location } = locations[0]

      printLog(`Using '${location.name}'`)

      const { items } = await instagram.request({ method: 'get_location_feed', params: [ location.pk ] })

      printLog(`Loaded ${items.length} photos. Requested to like ${nPhotos}.`)

      if (!items.length) {
        printLog(`Sorry, no photos to like in this location. Try more specific name.`)
        return
      }

      return safeMap(items.slice(0, nPhotos), item => instagram.request({ method: 'like', params: [item.id] }), printLog)
    }
  },

  load_pictures: {
    params: [
      {
        name: 'username',
        type: 'text',
        prefix: '@',
        labelText: 'Username',
        defaultValue: 'ohld',
      },
      {
        name: 'max_id',
        type: 'text',
        labelText: 'max_id (leave empty)',
      }
    ],
    run: async ({ username, max_id }, printLog = console.log) => {

      const { user: { pk, media_count } } = await instagram.request({ method: 'get_user_info', params: [ username ] })

      if (!pk || isNaN(pk)) throw new Error(`No user id: ${pk}`)

      const { items, next_max_id } = await instagram.request({ method: 'get_user_feed', params: [ pk, max_id ] })

      printLog(`Loaded a batch of ${items.length} items. Total users media: ${media_count}`)
      printLog(`You can access a next batch manually using this id: ${next_max_id}`)
      printLog(`Download this batch: downloadCSV()`)

      window.items = items
      window.downloadCSV = () => download(`items_${username}.csv`, getCSV(items))

      // downloadCSV()

      return
    }
  },

  load_stories: {
    params: [
      {
        name: 'username',
        type: 'text',
        prefix: '@',
        labelText: 'Username',
        defaultValue: 'ohld',
      },
    ],
    run: async ({ username }, printLog = console.log) => {

      const { user: { pk, media_count } } = await instagram.request({ method: 'get_user_info', params: [ username ] })

      if (!pk || isNaN(pk)) throw new Error(`No user id: ${pk}`)

      const { broadcast, reel, post_live_item } = await instagram.request({ method: 'get_user_story_feed', params: [ pk ] })

      console.log('Loaded')
      console.log('broadcast', broadcast)
      console.log('reel', reel)
      console.log('post_live_item', post_live_item)

      if (!reel) {
        printLog(`No stories for user @${username}. Abort`)
        return
      }

      const { items } = reel
      printLog(`Loaded ${items.length} stories for @${username}. Livestream: ${!!broadcast}. Finished streams: ${!!post_live_item}`)
      printLog(`Download this batch: downloadCSV()`)

      window.items = items
      window.downloadCSV = () => download(`stories_${username}.csv`, getCSV(items))

      items.map((item,index) => {
        printLog(`Story ${index+1}: `)

        if (item.video_dash_manifest) {
          printLog(`Video`, false)
          const matches = item.video_dash_manifest.match(/<BaseURL>(.*?)<\/BaseURL>/g)

          console.log('matches', matches)
          const urls = matches.map(token => token.replace(/<.*?>/g, ''))

          const types = ["Audio", "Video", "Video HD"]

          urls.map((url, index) => printLog(`<a href="${url}">Download ${types[index]}</a>`))
        } else if (item.image_versions2 && item.image_versions2.candidates) {
          printLog(`Photo`, false)
          const photo = item.image_versions2.candidates[0]

          console.log('photo', photo)
          const url = photo.url

          printLog(`<a href="${url}">Download Photo</a>`)
        } else {
          printLog(`Wrong format, skip`, false)
        }
      })
    }
  },

  find_nondual_followings: {
    name: 'Load users who you follow and who doesnt follow back',
    params: [
      {
        name: 'doUnfollow',
        type: 'checkbox',
        prefix: '',
        labelText: 'Unfollow them automatically ???',
        defaultValue: false,
      },
    ],
    run: async ({ doUnfollow = false }, printLog = console.log) => {
      const { user: { pk } } = await instagram.request({ method: 'check_login', params: [] })

      if (!pk || isNaN(pk)) throw new Error(`No user id: ${pk}`)

      // Phase 1: set up generator
      const following_list = instagram.page_generator({
        method: 'get_user_followings',
        params: [ pk ]
      })

      // Phase 2: paging
      const followings = new Lazy(following_list)
        .peek((page, index) => printLog(`Batch ${index} of followings loaded: ${page.users.length}`))
        .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))
        .map(page => makeGenerator(page.users))
        .flat()

      // Phase 3: search each in followers
      const follows = followings
        .filter((item, index) => {
          if (instagram.isStopped) {
            printLog(`Skipping ${index} ${item.username}: Request was killed`)
            return false
          }

          return true
        })
        .peek(user => printLog(`user: @${user.username}: `))
        .map(user =>
            instagram.request({ method: 'user_friendship', params: [ user.pk ] })
                .then(info => ({ friendship: info, ...user }))
        )
        .peek(user => printLog(user.friendship.followed_by ? 'follows you' : 'doesnt follow you', false))
        .peek(user => console.log('user', user))
        .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))

      const full_info = await follows.unwrap()

      window.full_info = full_info

      const non_dual = full_info.filter(user => user && user.friendship && !user.friendship.followed_by)

      window.non_dual = non_dual

      printLog(`Loaded!`)
      printLog(`You follow ${full_info.length} people.`)
      printLog(`${non_dual.length} of them dont follow you back.`)
      printLog(`Here they are:`)
      printLog(``)

      non_dual
        .map(user => printLog(`@${user.username}: https://instagram.com/${user.username}`))

      if (doUnfollow && confirm(`You sure you want to unfollow ${non_dual.length} people?`)) {
        const uf = new Lazy.from(non_dual.map(({ pk, username }) => ({ pk, username })))
          .peek(user => printLog(`Unfollow ${getURL(user)}`))
          .map(user => instagram.request({ method: 'unfollow', params: [ user.pk ] }))
          .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))

        return uf.unwrap()
      }

      return non_dual

    }
  },

  load_followers: {
    name: 'Load full list of user followers',
    params: [
      {
        name: 'username',
        type: 'text',
        prefix: '@',
        labelText: 'Username',
        defaultValue: 'burkinafan',
      },
      {
        name: 'isFullInfo',
        type: 'checkbox',
        prefix: '',
        labelText: 'Download full profile for each followers (takes much longer)',
        defaultValue: false,
      },
    ],
    run: async ({ username, isFullInfo = false }, printLog = console.log, timeout) => {
      const { user: { pk } } = await instagram.request({ method: 'get_user_info', params: [username] }, true)

      if (!pk || isNaN(pk)) throw new Error(`No user id: ${pk}`)

      // Phase 1: set up feed generator
      const follower_list = instagram.page_generator({
        method: 'get_user_followers',
        params: [ pk ]
      })

      // Phase 2: pages to list
      const users = new Lazy(follower_list)
        .peek((page, index) => printLog(`Batch ${index} of followers for @${username} loaded: ${page.users.length}`))
        .sleep(sec => printLog(`Sleeping ${sec.toFixed(1)} sec`))
        .map(page => makeGenerator(page.users))
        .flat()


      if (!isFullInfo) {
        const followers = await users.unwrap({ accumulate: true })

        printLog(`Followers for @${username} loaded: ${followers.length}`)
        printLog(`You can access them in window.followers or download using`)
        // printLog(`\t\tdownloadCSV()`)
        // printLog(`or`)
        printLog(`\t\tdownload('followers_${username}.csv', getCSV(followers))`)

        localStorage.setItem(`followers_${username}`, JSON.stringify(followers))

        window.followers = followers
        window.downloadCSV = () => download(`followers_${username}.csv`, getCSV(followers))

        downloadCSV()

        return
      }

      const followers_paging_generator = instagram.request_generator({ method: 'get_user_followers', params: [ pk ] })

      const safe_paging = safeGenerator(followers_paging_generator, printLog, timeout)

      const full_follower_list = mapGenerator(safe_paging, async (followers, batchIndex) => {
        printLog(`Batch ${batchIndex+1} of followers for @${username} loaded: ${followers.length}`)

        if (!isFullInfo) {
          return followers
        }

        const safe_batch = safeGenerator(makeGenerator(followers), printLog, timeout)

        const batch = await unwrapAccumulateGenerator(mapGenerator(safe_batch, async (follower, index) => {
          const { user } = await instagram.request({ method: 'get_user_info', params: [follower.pk]})

          printLog(`Batch ${batchIndex+1}: ${index+1}/${followers.length}: Loaded info for @${user.username}`)

          return user
        }))
        // const users = mapGenerator(infos, ({ user }) => user)
        //
        // const and_print = watchGenerator(users, user => printLog(`Loaded info for @${user.username}`))

        // return unwrapAccumulateGenerator(and_print)

        printLog(`Loaded batch. ${batch.length}`)

        return batch
      })

      const followers = await unwrapGenerator(reduceGenerator(full_follower_list, (arr, batch) => [ ...arr, ...batch ], []))

      printLog(`Followers for @${username} loaded: ${followers.length}`)
      printLog(`You can access them in window.followers or download using`)
      // printLog(`\t\tdownloadCSV()`)
      // printLog(`or`)
      printLog(`\t\tdownload('followers_${username}.csv', getCSV(followers))`)

      localStorage.setItem(`followers_${username}`, followers)

      window.followers = followers
      window.downloadCSV = () => download(`followers_${username}.csv`, getCSV(followers))

      downloadCSV()
    },
  },

  like_followers: {
    name: 'Like first photos of user followers',
    params: [
      {
        name: 'username',
        type: 'text',
        prefix: '@',
        labelText: 'Username',
      },
      {
        name: 'nFollowers',
        type: 'number',
        values: [1, 2, 3, 5, 10],
        labelText: 'Number of followers',
      },
      {
        name: 'nLikePhotos',
        type: 'number',
        values: [1],
        labelText: 'How many photos to like',
      },
    ],
    run: async ({ username, nFollowers = 3, nLikePhotos = 1 } = {}, printLog = console.log) => {
      const { user: { pk } } = await instagram.request({ method: 'get_user_info', params: [username] }, true)

      if (!pk || isNaN(pk)) throw new Error(`No user id: ${pk}`)

      const followers_paging_generator = instagram.request_generator({ method: 'get_user_followers', params: [ pk ] }, nFollowers)

      const followers_g = safeGenerator(followers_paging_generator, async followers => {

        printLog(`Followers for @${username} loaded: ${followers.length}`)

        if (!followers || !followers.length) throw new Error(`No followers: ${followers}`)

        printLog(`Will like ${followers.length} followers`)

        const photos = await safeMap(followers, user => instagram.request({ method: 'get_user_feed', params: [user.pk] }), printLog)

        const first_photos = photos.map(feed => feed.items && feed.items[0]).filter(item => !!item)

        return await safeMap(first_photos, item => instagram.request({ method: 'like', params: [item.id] }), printLog)

      }, printLog)

      const followers = await unwrapGenerator(followers_g)

      printLog(`Followers for @${username} loaded: ${followers.length}`)

      if (!followers || !followers.length) throw new Error(`No followers: ${followers}`)

      printLog(`Will like ${followers.slice(0, nFollowers).length} followers`)

      // const followers_generator = makeGenerator(followers)

      // const photos_g = safeGenerator(followers_generator, user => instagram.request({ method: 'get_user_feed', params: [user.pk] }), printLog)
      //
      // const photos = await unwrapGenerator(photos_g)
      const photos = await safeMap(followers.slice(0, nFollowers), user => instagram.request({ method: 'get_user_feed', params: [user.pk] }), printLog)

      const first_photos = photos.map(feed => feed.items && feed.items[0]).filter(item => !!item)

      return await safeMap(first_photos, item => instagram.request({ method: 'like', params: [item.id] }), printLog)
    },
  },
}
