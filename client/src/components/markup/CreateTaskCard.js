const { connect } = ReactRedux
const { Redirect } = ReactRouterDOM

class __CreateTaskCard extends React.Component {

  scriptName () {
    return this.props.name
  }

  constructor(props) {
    super(props)

    const script = scripts[this.scriptName()]

    if (!script) {
      this.state = {
        showAlertAfterFinish: false,
        shouldRedirectToLogs: false,
      }
      return
    }

    const params = script.params
      .reduce(
        (obj, item) => ({
          ...obj,
          [item.name]: item.defaultValue || ''
        }),
      {})

    this.script = script
    this.state = {
      showAlertAfterFinish: false,
      shouldRedirectToLogs: false,
      params: script.params,
      ...params,
    }
  }

  handleSubmit = async () => {
    this.props.showLoader()

    const scriptName = this.scriptName()

    const { showAlertAfterFinish } = this.state
    showAlertAfterFinish && this.props.notifyWhenQueueFinished()

    if (!instagram.isStopped) {
      alert(`Finish other tasks first!`)
      return
    }

    instagram.start()

    const params = this.script.params
      .map(item => `${item.name}: ${this.state[item.name]}`)
      .join(`, `)

    this.props.printLog(`Running script ${scriptName}: ${params}`)

    this.script.run(this.state, this.props.printLog)
      .then(res => this.props.sendMetrikaEvent(`task-success-${scriptName}`))
      .catch(err => {
          console.error(err)
          this.props.printLog(`Error: ${err.message}`)
          alert(err.message)
          this.props.sendMetrikaEvent(`task-error-${scriptName}`)
      })
      .finally(() => instagram.kill())
      .finally(() => this.props.hideLoader())

    this.props.sendMetrikaEvent(`task-started-${scriptName}`)

    this.handleRedirectToLogs()
  }

  handleChange = (event) => {
    const name = event.target.name
    const value = event.target.value

    this.setState({ [name]: value })
  }

  handleCheckboxChange = (event) => {
    const name = event.target.name
    const value = event.target.checked

    this.setState({ [name]: value })
  }

  handleNumberChange = (name, value) => (event) => {
    this.setState({
      [name]: value,
    })
  }

  handleRedirectToLogs = () => {
    this.setState({
      shouldRedirectToLogs: true,
    })
  }

  render () {
    const { params, showAlertAfterFinish, shouldRedirectToLogs } = this.state

    const scriptName = this.scriptName()

    if (shouldRedirectToLogs) {
      return <Redirect push to="/logs" />
    }

    if (!this.script) {
      return (
        <CardFullWidthPage>
          <h2>Script with name '{scriptName}' is not found</h2>
        </CardFullWidthPage>
      )
    }

    return (
      <CardFullWidthPage>
        <div className="row no-gutters align-items-center">
          <div className="col mr-12">
            <div className="text-xs font-weight-bold text-primary text-uppercase mb-12">
              {this.script.name || scriptName}
            </div>
          </div>
        </div>

        {this.script.description && (<div className="row">
          <div className="col-auto">
            <div className="" style={{ padding: '20px 0' }}>
              {this.script.description}
            </div>
          </div>
        </div>)}

        {params.map(({ labelText, name, type, prefix, values }, index) => (
          <div className="row" key={index}>
            <div className="col-auto">
                {(type === 'text' || type === 'number')&& (
                  <label htmlFor={name}>{labelText || name}</label>
                )}

                {type === 'text' && (
                  <div className="input-group mb-3">
                    {prefix && (
                      <div className="input-group-prepend">
                        <span className="input-group-text" id={`${scriptName}-prefix-symbol-${prefix}`}>
                          {prefix}
                        </span>
                      </div>
                    )}

                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id={`${scriptName}-${name}`}
                      name={name}
                      aria-describedby={`${scriptName}-prefix-symbol-${prefix}`}
                      value={this.state[name]}
                      onChange={this.handleChange}
                    />
                  </div>
                )}


                {type === 'checkbox' && (
                  <div className="form-check d-inline-block">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`${scriptName}-${name}`}
                      name={name}
                      value={this.state[name]}
                      onChange={this.handleCheckboxChange}
                    />
                    <label className="form-check-label" htmlFor={name}>
                      {labelText || name}
                    </label>
                  </div>
                )}

                {type === 'number' && (
                  <div className="btn-group d-block">
                    {(values || [1, 2, 3, 5, 10]).map((num, index) => (
                      <Button
                        id={`${scriptName}-${name}`}
                        className={num == this.state[name] ? `btn-primary` : `btn-secondary`}
                        key={index}
                        data-value={num}
                        ymParams={{num}}
                        ym={`${scriptName}-${name}-select`}
                        onClick={this.handleNumberChange(name, num)}
                      >
                        {num}
                      </Button>
                    ))}

                  </div>
                )}

            </div>
          </div>
        ))}


        <br />

        <div className="row">
          <div className="col-auto">

          </div>
        </div>


        <div className="row">
          <div className="col-auto">
            <div className="btn-group d-inline-block">
              <Button
                className="btn-primary"
                ym={`${scriptName}-submit`}
                onClick={this.handleSubmit}>
                Run!
              </Button>
            </div>
            <div className="d-inline-block">
              &nbsp;
            </div>
            <div className="d-inline-block">
              &nbsp;
            </div>

            <div className="form-check d-inline-block">
              <input
                type="checkbox"
                className="form-check-input"
                id={`${scriptName}-showAlertAfterFinish`}
                name="showAlertAfterFinish"
                value={showAlertAfterFinish}
                onChange={this.handleChange}
              />
              <label
                className="form-check-label"
                htmlFor="showAlertAfterFinish">Notify when queue finishes
              </label>
            </div>
          </div>
        </div>

      </CardFullWidthPage>
    )
  }
}

const CreateTaskCard = connect(
  null,
  { notifyWhenQueueFinished, showLoader, hideLoader, printLog, sendMetrikaEvent }
)(__CreateTaskCard)
