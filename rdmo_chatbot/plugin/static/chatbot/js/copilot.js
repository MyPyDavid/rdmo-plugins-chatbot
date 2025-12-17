const baseUrl = document.querySelector('meta[name="baseurl"]').content.replace(/\/+$/, '')
const language = document.querySelector('meta[name="language"]').content
const projectId = Number(document.querySelector('meta[name="project"]').content)

function truncate(string, maxLength = 32) {
  return string.length > maxLength ? string.slice(0, maxLength) + '…' : string;
}

const getCookie = (name) => {
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${name}=`))
    .map((cookie) => decodeURIComponent(cookie.split('=')[1]))
    .shift()
}

const getLangCode = async (args) => {
  return language
}

const getProjectId = async (args) => {
  return projectId
}

const getProject = async (args) => {
  const url = `${baseUrl}/api/v1/chatbot/projects/${projectId}/`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  return data
}

const toggleCopilot = async (args) => {
  window.toggleChainlitCopilot()
}

const handleTransfer = async (args) => {
  const questions = document.querySelectorAll('.interview-question')

  const inputs = Array.from(questions).reduce((inputs, question) => {
    const widgets = question.querySelectorAll('.interview-widget')
    return Array.from(widgets).reduce((inputs, widget) => {
      const input = widget.querySelector('input[type="text"], textarea')
      return input ? [...inputs, input] : inputs
    }, inputs)
  }, [])

  const backdrop = document.createElement('div')
  backdrop.id = 'chatbot-backdrop'
  backdrop.innerHTML = '<div class="fade modal-backdrop in"></div>'

  document.body.appendChild(backdrop)

  const buttons = document.createElement('div')
  buttons.id = 'chatbot-buttons'
  buttons.style.position = 'absolute'
  buttons.style.top = 0
  buttons.style.right = 0
  buttons.style.bottom = 0
  buttons.style.left = 0
  buttons.style.zIndex = 1050
  buttons.addEventListener('click', () => {
    document.getElementById('chatbot-backdrop').remove()
    document.getElementById('chatbot-buttons').remove()
  })

  document.body.appendChild(buttons)

  inputs.forEach(input => {
    const rect = input.getBoundingClientRect();
    const paddingTop = input.classList.contains('input-sm') ? 4 : 6
    const paddingRight = 6

    const buttonWrapper = document.createElement('div')
    buttonWrapper.classList.add('text-right')
    buttonWrapper.style.position = 'absolute'
    buttonWrapper.style.zIndex = 1050
    buttonWrapper.style.top = rect.top + paddingTop + window.scrollY + 'px'
    buttonWrapper.style.left = rect.left - paddingRight + window.scrollX + 'px'
    buttonWrapper.style.width = rect.width + 'px'
    buttonWrapper.style.height = rect.height + 'px'

    buttons.appendChild(buttonWrapper);

    const replaceButton = document.createElement('button');
    replaceButton.textContent = gettext('Replace')
    replaceButton.classList.add('btn', 'btn-danger', 'btn-xs')
    replaceButton.style.pointerEvents = 'auto'  // allow the button to be clicked
    replaceButton.addEventListener('click', () => setInput(input, args.content, false));

    buttonWrapper.appendChild(replaceButton);

    const appendButton = document.createElement('button');
    appendButton.textContent = gettext('Append')
    appendButton.classList.add('btn', 'btn-success', 'btn-xs')
    appendButton.style.marginLeft = '6px'
    appendButton.style.pointerEvents = 'auto'  // allow the button to be clicked
    appendButton.addEventListener('click', () => setInput(input, args.content, true));

    buttonWrapper.appendChild(appendButton)
  })
}

const setInput = async (input, content, append) => {
  const lastValue = input.value

  if (append) {
    input.value = input.value + ' ' + content
  } else {
    input.value = content
  }

  // the following is needed for react to pick up the change
  if (input._valueTracker) {
    input._valueTracker.setValue(lastValue)
  }
  input.dispatchEvent(new Event('input', { bubbles: true }))

  // document.getElementById('chatbot-backdrop').remove()
  // document.getElementById('chatbot-buttons').remove()
}

const openContactModal = async (args) => {
  const url = `${baseUrl}/api/v1/projects/projects/${projectId}/contact/`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  const contactData = await response.json()
  const contactModal = document.getElementById('chatbot-contact-modal')

  const chatHistory = args?.history ? '\n\n' + gettext('Chat history') + ':' + '\n\n' + (
    args.history.reduce((s,m) => s + `[${m.type}] ${m.content} \n`, '')
  ) : ''

  const subjectInput = contactModal.querySelector('#chatbot-contact-subject')
  const messageInput = contactModal.querySelector('#chatbot-contact-message')

  subjectInput.value = contactData.subject
  messageInput.value = contactData.message + chatHistory

  const submitButton = contactModal.querySelector('#chatbot-contact-submit')

  $(submitButton).off('click').on('click', async () => {
    submitButton.disabled = true

    try {
      const payload = {
        subject: subjectInput.value,
        message: messageInput.value
      }

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to send contact email (${response.status})`)
      }

      $(contactModal).modal('hide')
    } catch (error) {
      console.error(error)
    } finally {
      submitButton.disabled = false
    }
  })

  $(contactModal).modal('show')
}

const handlers = {
  getLangCode,
  getProjectId,
  getProject,
  toggleCopilot,
  handleTransfer,
  openContactModal
}

const copilotEventHandler = async (event) => {
  const { name, args, callback } = event.detail;

  const handler = handlers[name];

  const result = handler ? await handler(args) : {};

  callback(result)
}

window.copilotEventHandler = copilotEventHandler

const observedShadows = new WeakSet()

const patchFileInputs = (shadow) => {
  const uploadInputs = shadow.querySelectorAll('input[type="file"]')

  // The widget ships with an "*/*" accept attribute which is not valid and
  // triggers repeated console warnings in Firefox. Normalize it to empty so
  // the browser falls back to its default handling without warnings. Apply
  // this to every file input we find, since the widget can re-render the
  // element when starting a new chat.
  uploadInputs.forEach((input) => {
    const accept = input.getAttribute('accept')

    if (accept && accept.includes('*/*')) {
      input.setAttribute('accept', '')
    }
  })
}

const patchNewChatDialog = (shadow) => {
  const modal = shadow.getElementById("new-chat-dialog")
  const confirmButton = shadow.getElementById("confirm")

  if (modal && confirmButton && !confirmButton.dataset.hasHandler) {
    const existingTitle = shadow.querySelector('[data-radix-dialog-title], [role="heading"]')
    const titleId = 'chainlit-new-chat-title'

    if (!existingTitle) {
      const dialogTitle = document.createElement('h2')
      dialogTitle.id = titleId
      dialogTitle.setAttribute('data-radix-dialog-title', '')
      dialogTitle.textContent = gettext('Start a new chat')
      dialogTitle.style.position = 'absolute'
      dialogTitle.style.width = '1px'
      dialogTitle.style.height = '1px'
      dialogTitle.style.padding = '0'
      dialogTitle.style.margin = '-1px'
      dialogTitle.style.overflow = 'hidden'
      dialogTitle.style.clip = 'rect(0, 0, 0, 0)'
      dialogTitle.style.whiteSpace = 'nowrap'
      dialogTitle.style.border = '0'

      modal.prepend(dialogTitle)
      modal.setAttribute('aria-labelledby', titleId)
    }

    const descriptionId = 'chainlit-new-chat-description'
    const existingDescription = shadow.querySelector(`#${descriptionId}`)

    if (!existingDescription) {
      const dialogDescription = document.createElement('p')
      dialogDescription.id = descriptionId
      dialogDescription.textContent = gettext('This will reset the current conversation and start a new chat.')
      dialogDescription.style.position = 'absolute'
      dialogDescription.style.width = '1px'
      dialogDescription.style.height = '1px'
      dialogDescription.style.padding = '0'
      dialogDescription.style.margin = '-1px'
      dialogDescription.style.overflow = 'hidden'
      dialogDescription.style.clip = 'rect(0, 0, 0, 0)'
      dialogDescription.style.whiteSpace = 'nowrap'
      dialogDescription.style.border = '0'

      modal.prepend(dialogDescription)
      modal.setAttribute('aria-describedby', descriptionId)
    } else if (!modal.getAttribute('aria-describedby')) {
      modal.setAttribute('aria-describedby', descriptionId)
    }

    const handler = async (event) => {
      event.stopPropagation()

      window.sendChainlitMessage({
        type: "system_message",
        output: "",
        metadata: {
          "action": "reset_history",
          "project": parseInt(projectId)
        }
      })

      // remove this listener so we don’t fire again
      confirmButton.removeEventListener("click", handler)

      // trigger the original click (React handles it)
      setTimeout(() => confirmButton.click(), 500)

      // mark handler as attached to avoid duplicates
      confirmButton.dataset.hasHandler = "true"
    }

    // attach the listener
    confirmButton.addEventListener("click", handler)
  }
}

const applyCopilotPatches = () => {
  const copilot = document.getElementById("chainlit-copilot")
  if (!copilot) {
    return
  }

  const shadow = copilot.shadowRoot

  if (!shadow) {
    return
  }

  patchFileInputs(shadow)
  patchNewChatDialog(shadow)

  if (!observedShadows.has(shadow)) {
    const shadowObserver = new MutationObserver(() => {
      patchFileInputs(shadow)
      patchNewChatDialog(shadow)
    })

    shadowObserver.observe(shadow, { childList: true, subtree: true })
    observedShadows.add(shadow)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(applyCopilotPatches)

  // Run once in case the widget is already rendered before we start observing.
  applyCopilotPatches()

  observer.observe(document.body, { childList: true, subtree: true })
});
