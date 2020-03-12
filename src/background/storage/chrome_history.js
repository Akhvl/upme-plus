import { History } from '../instagram'
import Collection from './collection'

export class ChromeHistory extends History {
  constructor () {
    super()

    this.collection = new Collection('history', [
      ...History.AVAILABLE_METHODS, 'login', 'misc',
    ])
  }

  async save (method, params, result) {
    const { status } = result

    const entry = { params, status }

    return this.collection.save(method, entry)
  }

  async get (...methods) {
    return this.collection.get(...methods)
  }
}

export default ChromeHistory
