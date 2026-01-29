document.addEventListener("DOMContentLoaded", () => {
  const createLlmSelector = () => {
    if (document.getElementById("llm-selector")) {
      return
    }

    const container = document.createElement("div")
    container.id = "llm-selector"
    container.style.position = "fixed"
    container.style.right = "16px"
    container.style.bottom = "16px"
    container.style.zIndex = "9999"
    container.style.background = "rgba(18, 18, 18, 0.9)"
    container.style.padding = "12px"
    container.style.borderRadius = "8px"
    container.style.color = "#fff"
    container.style.fontSize = "12px"
    container.style.width = "220px"
    container.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.3)"

    const title = document.createElement("div")
    title.textContent = "LLM Settings"
    title.style.fontWeight = "600"
    title.style.marginBottom = "8px"
    container.appendChild(title)

    const modelLabel = document.createElement("label")
    modelLabel.textContent = "Model"
    modelLabel.style.display = "block"
    modelLabel.style.marginBottom = "4px"
    container.appendChild(modelLabel)

    const modelInput = document.createElement("input")
    modelInput.type = "text"
    modelInput.placeholder = "e.g. gpt-4.1-mini"
    modelInput.style.width = "100%"
    modelInput.style.marginBottom = "8px"
    modelInput.style.padding = "6px"
    modelInput.style.borderRadius = "4px"
    modelInput.style.border = "1px solid #444"
    modelInput.style.background = "#1e1e1e"
    modelInput.style.color = "#fff"
    container.appendChild(modelInput)

    const endpointLabel = document.createElement("label")
    endpointLabel.textContent = "Endpoint"
    endpointLabel.style.display = "block"
    endpointLabel.style.marginBottom = "4px"
    container.appendChild(endpointLabel)

    const endpointInput = document.createElement("input")
    endpointInput.type = "text"
    endpointInput.placeholder = "e.g. https://api.openai.com/v1"
    endpointInput.style.width = "100%"
    endpointInput.style.marginBottom = "8px"
    endpointInput.style.padding = "6px"
    endpointInput.style.borderRadius = "4px"
    endpointInput.style.border = "1px solid #444"
    endpointInput.style.background = "#1e1e1e"
    endpointInput.style.color = "#fff"
    container.appendChild(endpointInput)

    const buttonRow = document.createElement("div")
    buttonRow.style.display = "flex"
    buttonRow.style.gap = "8px"

    const applyButton = document.createElement("button")
    applyButton.textContent = "Apply"
    applyButton.style.flex = "1"
    applyButton.style.padding = "6px"
    applyButton.style.borderRadius = "4px"
    applyButton.style.border = "none"
    applyButton.style.cursor = "pointer"
    applyButton.style.background = "#2d6cdf"
    applyButton.style.color = "#fff"

    const resetButton = document.createElement("button")
    resetButton.textContent = "Default"
    resetButton.style.flex = "1"
    resetButton.style.padding = "6px"
    resetButton.style.borderRadius = "4px"
    resetButton.style.border = "1px solid #555"
    resetButton.style.cursor = "pointer"
    resetButton.style.background = "#1e1e1e"
    resetButton.style.color = "#fff"

    const sendConfig = (payload) => {
      window.postMessage({
        type: "system_message",
        content: "",
        metadata: {
          action: "set_llm_config",
          payload
        }
      })
    }

    applyButton.addEventListener("click", () => {
      sendConfig({
        model: modelInput.value.trim(),
        endpoint: endpointInput.value.trim()
      })
    })

    resetButton.addEventListener("click", () => {
      modelInput.value = ""
      endpointInput.value = ""
      sendConfig({ model: "", endpoint: "" })
    })

    buttonRow.appendChild(applyButton)
    buttonRow.appendChild(resetButton)
    container.appendChild(buttonRow)

    document.body.appendChild(container)
  }

  const observer = new MutationObserver((mutations, obs) => {
    createLlmSelector()
    const modal = document.getElementById("new-chat-dialog")
    const confirmButton = document.getElementById("confirm")

    if (modal && confirmButton && !confirmButton.dataset.hasHandler) {
      const handler = async (event) => {
        event.stopPropagation()

        window.postMessage({
          type: "system_message",
          content: "",
          metadata: {
            "action": "reset_history"
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
  })

  observer.observe(document.body, { childList: true, subtree: true })
});
